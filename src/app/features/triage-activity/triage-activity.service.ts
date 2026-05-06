import { HttpClient } from '@angular/common/http';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

// Mirrors TriageNowResponse.debug from jimbo-api/schemas/google-tasks.ts.
// Optional fields are present for boris-loop runs that don't bother
// with URL fetching telemetry — render-side guards against undefined.
export interface TriageDebug {
  skill_version: string | null;
  model: string;
  url_detected?: string | null;
  url_kind?: 'x' | 'generic' | 'none';
  url_fetch_status?: 'fetched' | 'x-fetched' | 'skipped-x-no-creds' | 'fetch-failed' | 'no-url';
  url_fetch_summary?: string | null;
  prompt_chars: number;
  raw_response_chars: number;
  parse_ok: boolean;
  latency_ms: number;
  raw_response: string;
  usage: {
    prompt_tokens: number | null;
    completion_tokens: number | null;
    total_tokens: number | null;
  };
  // Provenance — present when produced by an external runner (boris-loop on M2).
  // Server-side /triage-now writes don't set this.
  runner?: 'boris-loop';
  runner_version?: string;
}

export interface TriageProposal {
  type: 'task' | 'note' | 'idea';
  category: string | null;
  ai_priority: number | null;
  priority_confidence: number | null;
  tags: string[];
  suggested_parent_id: string | null;
  suggested_agent_type: string | null;
  ai_rationale: string;
  questions: Array<{ q: string; why: string }>;
}

export interface TriageHistoryItem {
  google_list_id: string;
  google_task_id: string;
  proposal: TriageProposal | null;
  debug: TriageDebug;
  skill_version: string | null;
  model: string;
  user_context_at_creation: string | null;
  created_at: string;
}

interface HistoryResponse {
  items: TriageHistoryItem[];
  count: number;
}

interface InboxTask {
  id: string;
  title: string;
  listId: string;
  listTitle: string;
}

interface InboxResponse {
  tasks: InboxTask[];
  count: number;
}

const REFRESH_INTERVAL_MS = 30_000;
const DEFAULT_LIMIT = 50;

@Injectable({ providedIn: 'root' })
export class TriageActivityService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.dashboardApiUrl;

  private readonly _items = signal<TriageHistoryItem[]>([]);
  private readonly _inboxTitles = signal<Map<string, string>>(new Map());
  private readonly _loading = signal(false);
  private readonly _lastError = signal<string | null>(null);
  private readonly _lastFetch = signal<string | null>(null);

  readonly items = this._items.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly lastError = this._lastError.asReadonly();
  readonly lastFetch = this._lastFetch.asReadonly();

  readonly count = computed(() => this._items().length);

  // Resolve a task id to its current inbox title, or null if it's no
  // longer in the inbox (already promoted/discarded). Render shows the
  // task id as a fallback in that case.
  taskTitle(taskId: string): string | null {
    return this._inboxTitles().get(taskId) ?? null;
  }

  private timerHandle: ReturnType<typeof setInterval> | null = null;
  private started = false;

  start(): void {
    if (this.started) return;
    this.started = true;
    void this.refresh();
    this.timerHandle = setInterval(() => void this.refresh(), REFRESH_INTERVAL_MS);
    // Tear down if the consumer's DestroyRef fires.
    inject(DestroyRef).onDestroy(() => this.stop());
  }

  stop(): void {
    if (this.timerHandle !== null) {
      clearInterval(this.timerHandle);
      this.timerHandle = null;
    }
    this.started = false;
  }

  async refresh(limit: number = DEFAULT_LIMIT): Promise<void> {
    this._loading.set(true);
    this._lastError.set(null);
    try {
      // Parallel fetch — history is the data, inbox is the title lookup.
      const [history, inbox] = await Promise.all([
        firstValueFrom(this.http.get<HistoryResponse>(
          `${this.base}/api/google-tasks/triage-history`,
          { params: { limit: String(limit) } },
        )),
        firstValueFrom(this.http.get<InboxResponse>(
          `${this.base}/api/google-tasks/inbox`,
        )).catch((): InboxResponse => ({ tasks: [], count: 0 })),
      ]);
      this._items.set(history.items ?? []);
      const titleMap = new Map<string, string>();
      for (const t of inbox.tasks ?? []) titleMap.set(t.id, t.title);
      this._inboxTitles.set(titleMap);
      this._lastFetch.set(new Date().toISOString());
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'fetch failed';
      this._lastError.set(msg);
    } finally {
      this._loading.set(false);
    }
  }
}
