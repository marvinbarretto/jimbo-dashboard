// Reads dispatch_queue rows from jimbo-api at /api/dispatch/queue.
// Retry mutation has no direct jimbo-api equivalent yet — see retry() below.

import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { DispatchQueueEntry, DispatchStatus, CommissionItem } from '@domain/dispatch';
import { groupCommissions } from '@domain/dispatch';
import { ApiDispatchEntrySchema, ApiDispatchesResponseSchema, type ApiDispatchEntry } from '@domain/dispatch/dispatch.api-schema';
import type { DispatchId, VaultItemId } from '@domain/ids';
import { dispatchId, vaultItemId, actorId, skillId } from '@domain/ids';
import { environment } from '../../../../environments/environment';
import { ToastService } from '@shared/components/toast/toast.service';
import {
  withOptimisticRemove,
  withOptimisticUpdate,
} from '@shared/data-access/with-optimistic';
import { isSeedMode } from '@shared/seed-mode';
import { SEED } from '@domain/seed';

// Statuses the API will accept for hard-delete. Mirrored from jimbo-api's
// DELETE /dispatch/{id} gate. Listed here so the typed `clearTerminal` call
// can refuse non-terminal asks at the boundary instead of hitting a 409.
const TERMINAL_STATUSES = ['completed', 'failed', 'removed', 'rejected'] as const;
type TerminalStatus = typeof TERMINAL_STATUSES[number];

@Injectable({ providedIn: 'root' })
export class DispatchService {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly url = `${environment.dashboardApiUrl}/api/dispatch/queue`;

  private readonly _entries = signal<DispatchQueueEntry[]>([]);
  private readonly _loading = signal(true);

  readonly entries  = this._entries.asReadonly();
  readonly isLoading = this._loading.asReadonly();

  // Per-item commission view — one entry per vault item, commission flow only,
  // with current stage + history. This is what the rebuilt execution board
  // consumes instead of the raw per-dispatch `entries`. Reactive: recomputes
  // whenever the queue reloads or a mutation updates an entry.
  readonly commissions = computed<CommissionItem[]>(() => groupCommissions(this._entries()));

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
        this._entries.set(result.data.items.filter(a => a.status !== 'removed').map(toDispatchEntry));
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

  // Operator-triggered retry of a terminally-failed dispatch. The server owns
  // the column flip — we POST to /api/dispatch/{id}/retry with no body and let
  // jimbo-api compute status='approved', clear error_message/started_at/
  // completed_at, and increment retry_count. The optimistic shape mirrors what
  // the server will return so the UI updates instantly; the schema check on
  // success reconciles against canonical state.
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

    if (isSeedMode()) {
      this._entries.update(es => es.map(e => e.id === id ? optimistic : e));
      return;
    }

    withOptimisticUpdate(this._entries, this.toast, {
      prior,
      next: optimistic,
      request: this.http.post<unknown>(
        `${environment.dashboardApiUrl}/api/dispatch/${encodeURIComponent(id)}/retry`,
        {},
      ),
      errorMessage: 'Retry failed — changes reverted',
      // Successful HTTP response — but we still need to validate the payload
      // shape before swapping in server-canonical state. A schema mismatch
      // is NOT a rollback case (the server already committed); we warn the
      // operator and leave the optimistic state in place.
      onSuccess: (raw) => {
        const result = ApiDispatchEntrySchema.safeParse(raw);
        if (!result.success) {
          console.error('[dispatch] /retry response failed schema:', result.error.issues);
          this.toast.error('Retry queued but response was malformed — refresh to confirm');
          return;
        }
        this._entries.update(es => es.map(e => e.id === id ? toDispatchEntry(result.data) : e));
        this.toast.success('Dispatch queued for retry');
      },
    });
  }

  /**
   * Hard-delete a single dispatch row. Backed by `DELETE /api/dispatch/{id}`
   * which gates on terminal status server-side; the dashboard refuses early
   * here to keep the optimistic remove from flickering on rows the API will
   * refuse anyway. costs.dispatch_id cascades to NULL on the server side so
   * accounting history survives.
   */
  delete(id: DispatchId): void {
    const prior = this.getById(id);
    if (!prior) return;
    if (!(TERMINAL_STATUSES as readonly string[]).includes(prior.status)) {
      this.toast.error(`Can't delete a ${prior.status.replace('_', ' ')} dispatch`);
      return;
    }

    withOptimisticRemove(this._entries, this.toast, {
      prior,
      request: this.http.delete<void>(
        `${environment.dashboardApiUrl}/api/dispatch/${encodeURIComponent(id)}`,
      ),
      errorMessage: 'Delete failed — entry restored',
      seedMode: isSeedMode(),
      onSuccess: () => this.toast.success('Dispatch dismissed'),
    });
  }

  /**
   * Bulk-delete every entry whose status is in the requested terminal set.
   * Used by column-level "dismiss all" gestures (e.g. clear the COMPLETED
   * column). Optimistic with rollback: locally filtered first, server
   * confirms the count.
   *
   * Statuses outside the terminal set are dropped at the boundary; the
   * server filters again as defence in depth.
   */
  clearTerminal(statuses: readonly TerminalStatus[]): void {
    const filteredStatuses = statuses.filter(s => (TERMINAL_STATUSES as readonly string[]).includes(s));
    if (filteredStatuses.length === 0) return;

    const targets = this._entries().filter(e => (filteredStatuses as readonly string[]).includes(e.status));
    if (targets.length === 0) return;

    if (isSeedMode()) {
      this._entries.update(es => es.filter(e => !(filteredStatuses as readonly string[]).includes(e.status)));
      this.toast.success(`Cleared ${targets.length}`);
      return;
    }

    const prior = this._entries();
    this._entries.update(es => es.filter(e => !(filteredStatuses as readonly string[]).includes(e.status)));

    this.http
      .post<{ deleted: number }>(
        `${environment.dashboardApiUrl}/api/dispatch/clear-terminal`,
        { statuses: filteredStatuses },
      )
      .subscribe({
        next: (res) => this.toast.success(`Cleared ${res.deleted}`),
        error: () => {
          this._entries.set(prior);
          this.toast.error('Bulk clear failed — entries restored');
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
    // Commission-flow fields — carried through so the board can filter to
    // commissions and render PR state. flow/pr_state stay open unions (the wire
    // schema validates them as plain strings).
    flow: a.flow,
    agent_type: a.agent_type,
    pr_state: a.pr_state,
    pr_url: a.pr_url,
  };
}
