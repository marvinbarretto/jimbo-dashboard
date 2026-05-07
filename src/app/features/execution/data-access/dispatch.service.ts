// Reads dispatch_queue rows from jimbo-api at /api/dispatch/queue.
// Retry mutation has no direct jimbo-api equivalent yet — see retry() below.

import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { DispatchQueueEntry, DispatchStatus } from '@domain/dispatch';
import { ApiDispatchEntrySchema, ApiDispatchesResponseSchema, type ApiDispatchEntry } from '@domain/dispatch/dispatch.api-schema';
import type { DispatchId, VaultItemId } from '@domain/ids';
import { dispatchId, vaultItemId, actorId, skillId } from '@domain/ids';
import { environment } from '../../../../environments/environment';
import { ToastService } from '@shared/components/toast/toast.service';
import { isSeedMode } from '@shared/seed-mode';
import { SEED } from '@domain/seed';

@Injectable({ providedIn: 'root' })
export class DispatchService {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly url = `${environment.dashboardApiUrl}/api/dispatch/queue`;

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
    // jimbo-api caps `limit` at 100 — sending more gets a 400 from zod validation.
    this.http.get<unknown>(`${this.url}?limit=100`).subscribe({
      next: (raw) => {
        const result = ApiDispatchesResponseSchema.safeParse(raw);
        if (!result.success) {
          console.error('[dispatch] /api/dispatch/queue response failed schema:', result.error.issues);
          this.toast.error('Failed to load dispatch queue — API response did not match expected shape');
          this._loading.set(false);
          return;
        }
        this._entries.set(result.data.items.map(toDispatchEntry));
        this._loading.set(false);
      },
      error: () => {
        this.toast.error('Failed to load dispatch queue — network or server error');
        this._loading.set(false);
      },
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

    // TODO: jimbo-api has no PATCH-by-dispatch-id endpoint. POST /api/dispatch/approve
    // takes item_ids (task IDs) not dispatch IDs. Needs a dedicated retry endpoint.
    // For now this 404s and the optimistic update reverts cleanly.
    const patch = {
      status:        'approved' as const,
      error_message: null,
      started_at:    null,
      completed_at:  null,
      retry_count:   prior.retry_count + 1,
    };
    this.http.patch<unknown>(`${environment.dashboardApiUrl}/api/dispatch/${encodeURIComponent(id)}`, patch).subscribe({
      next: (raw) => {
        const result = ApiDispatchEntrySchema.safeParse(raw);
        if (!result.success) {
          console.error('[dispatch] PATCH retry response failed schema:', result.error.issues);
          this.toast.error('Retry queued but response was malformed — refresh to confirm');
          return;
        }
        this._entries.update(es => es.map(e => e.id === id ? toDispatchEntry(result.data) : e));
        this.toast.success('Dispatch queued for retry');
      },
      error: () => {
        this._entries.update(es => es.map(e => e.id === id ? prior : e));
        this.toast.error('Retry failed — changes reverted');
      },
    });
  }
}

// ── API response adaptation ────────────────────────────────────────────────
// Shape comes from ApiDispatchEntrySchema (Zod). The mapper still narrows
// the wider DB status enum into the dashboard's DispatchStatus union.

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
    case 'proposed':    return 'approved';
    case 'running':     return 'running';
    case 'rejected':    return 'failed';
    case 'removed':     return 'failed';
    case 'approved':    return 'approved';
    case 'dispatching': return 'dispatching';
    case 'completed':   return 'completed';
    case 'failed':      return 'failed';
  }
}

function toDispatchEntry(a: ApiDispatchEntry): DispatchQueueEntry {
  return {
    id: dispatchId(String(a.id)),
    task_id: vaultItemId(a.task_id),
    skill: skillId(a.skill ?? a.agent_type),       // fall back to agent_type when skill not set
    status: narrowStatus(a.status),
    executor: a.executor ? actorId(a.executor) : null,
    started_at: a.started_at,
    completed_at: a.completed_at,
    retry_count: a.retry_count,
    skill_context: a.skill_context,
    result_summary: a.result_summary,
    error: a.error_message,
    created_at: a.created_at,
    task_title: a.task_title ?? null,
    task_seq: a.task_seq != null ? Number(a.task_seq) : null,
  };
}
