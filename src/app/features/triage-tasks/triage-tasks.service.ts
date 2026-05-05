import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface InboxTask {
  id: string;
  title: string;
  notes?: string;
  due?: string;
  updated: string;
  status: string;
  listId: string;
  listTitle: string;
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

export interface TriageDebug {
  skill_version: string | null;
  model: string;
  url_detected: string | null;
  url_kind: 'x' | 'generic' | 'none';
  url_fetch_status: 'fetched' | 'x-fetched' | 'skipped-x-no-creds' | 'fetch-failed' | 'no-url';
  url_fetch_summary: string | null;
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
}

export interface TriageNowResult {
  proposal: TriageProposal | null;
  debug: TriageDebug;
}

export type TriageNowCachedResult =
  | {
      cached: true;
      proposal: TriageProposal | null;
      debug: TriageDebug;
      skill_version: string | null;
      created_at: string;
    }
  | {
      cached: false;
      reason: 'miss' | 'stale';
      stored_skill_version?: string | null;
    };

@Injectable({ providedIn: 'root' })
export class TriageTasksService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.dashboardApiUrl;

  readonly tasks = signal<InboxTask[] | undefined>(undefined);
  readonly error = signal<string | null>(null);
  readonly loading = signal(false);

  // id (string) → human label, e.g. "4" → "Jimbo/Hermes". Built once from the
  // priorities context file's "Active Projects" section so the modal can
  // render `project:Jimbo/Hermes` instead of the raw `project:4` the LLM emits.
  readonly activeProjects = signal<Map<string, string>>(new Map());

  constructor() {
    this.loadActiveProjects();
  }

  private loadActiveProjects(): void {
    type ContextFile = {
      sections?: Array<{ name: string; items?: Array<{ id: number; label: string }> }>;
    };
    this.http.get<ContextFile>(`${this.base}/api/context/files/priorities`).subscribe({
      next: file => {
        const section = file.sections?.find(s => s.name === 'Active Projects');
        const map = new Map<string, string>();
        for (const item of section?.items ?? []) {
          map.set(String(item.id), item.label);
        }
        console.log(`[TriageTasks] active projects loaded: ${map.size}`);
        this.activeProjects.set(map);
      },
      error: e => console.warn('[TriageTasks] active projects load failed (non-fatal)', e),
    });
  }

  triageNow(listId: string, taskId: string, userContext: string): Observable<TriageNowResult> {
    console.log('[TriageTasks] triageNow ->', { listId, taskId, userContextLen: userContext.length });
    return this.http.post<TriageNowResult>(`${this.base}/api/google-tasks/triage-now`, {
      listId,
      taskId,
      user_context: userContext,
    });
  }

  getCachedProposal(listId: string, taskId: string): Observable<TriageNowCachedResult> {
    return this.http.get<TriageNowCachedResult>(`${this.base}/api/google-tasks/triage-now/cached`, {
      params: { listId, taskId },
    });
  }

  logTriageAction(payload: {
    listId: string;
    taskId: string;
    proposal: TriageProposal | null;
    user_context: string | null;
    action: 'promote' | 'discard' | 'skip';
    override?: Record<string, unknown> | null;
  }): Observable<{ ok: true }> {
    console.log('[TriageTasks] logTriageAction ->', { taskId: payload.taskId, action: payload.action, hasProposal: !!payload.proposal });
    return this.http.post<{ ok: true }>(`${this.base}/api/google-tasks/triage-log`, payload);
  }

  commit(payload: {
    taskId: string;
    listId: string;
    title: string;
    body?: string;
    type?: string;
    tags?: string;
  }): Observable<{ vaultNoteId: string; googleTaskDeleted: boolean }> {
    console.log('[TriageTasks] commit ->', { taskId: payload.taskId, type: payload.type, tagsLen: payload.tags?.length ?? 0 });
    return this.http.post<{ vaultNoteId: string; googleTaskDeleted: boolean }>(
      `${this.base}/api/google-tasks/commit`,
      payload,
    );
  }

  deleteTask(listId: string, taskId: string): Observable<{ googleTaskDeleted: boolean }> {
    console.log('[TriageTasks] deleteTask ->', { listId, taskId });
    return this.http.request<{ googleTaskDeleted: boolean }>(
      'DELETE',
      `${this.base}/api/google-tasks/tasks`,
      { body: { listId, taskId } },
    );
  }

  removeFromCache(taskId: string): void {
    this.tasks.update(tasks => tasks?.filter(t => t.id !== taskId));
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.http
      .get<{ tasks: InboxTask[]; count: number }>(`${this.base}/api/google-tasks/inbox`)
      .subscribe({
        next: r => {
          this.tasks.set(r.tasks);
          this.loading.set(false);
        },
        error: e => {
          const msg = e?.error?.message ?? e?.message ?? 'Failed to load tasks';
          this.error.set(msg);
          this.loading.set(false);
          console.error('[TriageTasks] load error', e);
        },
      });
  }
}
