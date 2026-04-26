// Reads dispatch_queue rows from the dashboard's new Hono+Drizzle API at
// /api/dispatches (jimbo_pg-backed). Mutations (retry) still go via the
// legacy PostgREST path until write endpoints land.

import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import type { DispatchQueueEntry, DispatchStatus } from '@domain/dispatch';
import type { DispatchId, VaultItemId, ActorId, SkillId } from '@domain/ids';
import { dispatchId, vaultItemId, actorId, skillId } from '@domain/ids';
import { environment } from '../../../../environments/environment';
import { isSeedMode } from '@shared/seed-mode';
import { SEED } from '@domain/seed';

@Injectable({ providedIn: 'root' })
export class DispatchService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/dispatch-queue`;

  private readonly _entries = signal<DispatchQueueEntry[]>([]);
  private readonly _loading = signal(true);

  readonly entries  = this._entries.asReadonly();
  readonly isLoading = this._loading.asReadonly();

  constructor() { this.load(); }

  private load(): void {
    if (isSeedMode()) {
      this._entries.set([...SEED.dispatch_entries]);
      this._loading.set(false);
      return;
    }
    // /api/dispatches returns the production schema (6 status values, more
    // columns). Map at the service boundary to the dashboard's narrower
    // DispatchQueueEntry shape.
    this.http.get<ApiDispatchesResponse>(`${environment.dashboardApiUrl}/api/dispatches?limit=500`).subscribe({
      next: ({ items }) => { this._entries.set(items.map(toDispatchEntry)); this._loading.set(false); },
      error: ()         => this._loading.set(false),
    });
  }

  getById(id: DispatchId): DispatchQueueEntry | undefined {
    return this._entries().find(e => e.id === id);
  }

  // All dispatches for a given vault item, newest first. Used by vault-item-detail
  // to show the dispatch history alongside the activity log.
  forTask(taskId: VaultItemId) {
    return computed(() =>
      this._entries()
        .filter(e => e.task_id === taskId)
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    );
  }

  // Operator-triggered retry of a failed dispatch. Flips status back to 'approved',
  // clears the error, increments retry_count. Production may prefer a new row per
  // attempt to preserve full history; we mutate in place here for simplicity.
  retry(id: DispatchId): void {
    const prior = this.getById(id);
    if (!prior || prior.status !== 'failed') return;
    const optimistic: DispatchQueueEntry = {
      ...prior,
      status: 'approved',
      error: null,
      started_at: null,
      completed_at: null,
      retry_count: prior.retry_count + 1,
    };
    this._entries.update(es => es.map(e => e.id === id ? optimistic : e));

    if (isSeedMode()) return;

    const params = new HttpParams().set('id', `eq.${id}`);
    const patch = {
      status:       'approved' as const,
      error:        null,
      started_at:   null,
      completed_at: null,
      retry_count:  prior.retry_count + 1,
    };
    this.http.patch<DispatchQueueEntry[]>(this.url, patch, { params, headers: { Prefer: 'return=representation' } })
      .subscribe({
        next: ([updated]) => this._entries.update(es => es.map(e => e.id === id ? updated : e)),
        error: ()          => this._entries.update(es => es.map(e => e.id === id ? prior : e)),
      });
  }
}

// ── API response adaptation ────────────────────────────────────────────────
// Production has six status values (proposed, approved, rejected, completed,
// failed, removed) plus more columns; dashboard's DispatchStatus is five
// (approved, dispatching, running, completed, failed). Map at the boundary.

interface ApiDispatchEntry {
  id: number;
  task_id: string;
  task_source: string;
  flow: string;
  agent_type: string;
  executor: string | null;
  skill: string | null;
  skill_context: unknown;
  status: 'proposed' | 'approved' | 'running' | 'rejected' | 'completed' | 'failed' | 'removed';
  result_summary: string | null;
  error_message: string | null;
  retry_count: number;
  proposed_at: string | null;
  approved_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  task_title: string | null;
  task_seq: number | null;
}

interface ApiDispatchesResponse {
  items: ApiDispatchEntry[];
  total: number;
  limit: number;
}

// Production statuses → dashboard DispatchStatus union.
//   proposed  → approved   (queued, awaiting work — same UI semantics)
//   running   → running    (executor is actively working on this dispatch)
//   rejected  → failed     (operator declined; surface in Failed column)
//   removed   → failed     (reaped/removed; surface in Failed column)
//   approved/completed/failed → as-is
// 'dispatching' is a dashboard-only state (claim-in-flight) with no production
// equivalent — that column is reserved for a future real-time signal.
function narrowStatus(s: ApiDispatchEntry['status']): DispatchStatus {
  switch (s) {
    case 'proposed':  return 'approved';
    case 'running':   return 'running';
    case 'rejected':  return 'failed';
    case 'removed':   return 'failed';
    case 'approved':  return 'approved';
    case 'completed': return 'completed';
    case 'failed':    return 'failed';
  }
}

function toDispatchEntry(a: ApiDispatchEntry): DispatchQueueEntry {
  return {
    id: dispatchId(String(a.id)),
    task_id: vaultItemId(a.task_id),
    skill: skillId(a.skill ?? a.agent_type),       // fall back to agent_type when skill not set
    status: narrowStatus(a.status),
    executor: actorId(a.executor ?? 'unassigned'),
    started_at: a.started_at,
    completed_at: a.completed_at,
    retry_count: a.retry_count,
    skill_context: a.skill_context,
    result_summary: a.result_summary,
    error: a.error_message,
    created_at: a.created_at,
  };
}
