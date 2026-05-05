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
  url_fetch_status: 'fetched' | 'skipped-x-no-creds' | 'fetch-failed' | 'no-url';
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

@Injectable({ providedIn: 'root' })
export class TriageTasksService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.dashboardApiUrl;

  readonly tasks = signal<InboxTask[] | undefined>(undefined);
  readonly error = signal<string | null>(null);
  readonly loading = signal(false);

  triageNow(listId: string, taskId: string, userContext: string): Observable<TriageNowResult> {
    console.log('[TriageTasks] triageNow ->', { listId, taskId, userContextLen: userContext.length });
    return this.http.post<TriageNowResult>(`${this.base}/api/google-tasks/triage-now`, {
      listId,
      taskId,
      user_context: userContext,
    });
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
