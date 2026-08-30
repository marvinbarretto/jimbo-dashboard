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
  /** Rows the server holds, vs. the QUEUE_LIMIT this loads. */
  private readonly _total = signal(0);

  readonly entries  = this._entries.asReadonly();
  readonly isLoading = this._loading.asReadonly();

  /**
   * How much of the dispatch table the board is actually looking at. Agent
   * cards derive entirely from this window, so a board that renders one
   * commission out of thousands of rows has to be able to say so.
   */
  readonly window = computed(() => ({
    loaded: this._entries().length,
    total:  this._total(),
    truncated: this._total() > this._entries().length,
  }));

  // Per-item commission view — one entry per vault item, commission flow only,
  // with current stage + history. This is what the rebuilt execution board
  // consumes instead of the raw per-dispatch `entries`. Reactive: recomputes
  // whenever the queue reloads or a mutation updates an entry.
  readonly commissions = computed<CommissionItem[]>(() => groupCommissions(this._entries()));

  constructor() { this.load(); }

  private load(): void {
    if (isSeedMode()) {
      this._entries.set([...SEED.dispatch_entries]);
      this._total.set(SEED.dispatch_entries.length);
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
        this._total.set(result.data.total);
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

  /**
   * Re-read ONE dispatch. Driven by `dispatch.stage_changed` on the live
   * stream, where refetching the whole 100-row queue per event would be the
   * expensive answer to a question about a single card.
   *
   * Silent on failure and on a 404 — this is a freshness top-up, not a user
   * action, and a stale card beats a toast the operator can't act on. A
   * dispatch that has been hard-deleted is dropped from the store rather than
   * left behind as a card with no row.
   */
  refreshOne(id: DispatchId): void {
    if (isSeedMode()) return;
    this.http.get<unknown>(`${environment.dashboardApiUrl}/api/dispatch/${id}`).subscribe({
      next: (raw) => {
        const result = ApiDispatchEntrySchema.safeParse(raw);
        if (!result.success) {
          console.error('[dispatch] refreshOne response failed schema:', result.error.issues);
          return;
        }
        // The single-row endpoint doesn't join the vault item, so title/seq
        // arrive undefined. Carry over what the list load already knew rather
        // than blanking a card's title as the price of a stage update. A
        // dispatch we've never seen has nothing to carry over — it renders
        // titleless until the next full load, which beats not appearing.
        const prior = this._entries().find(e => e.id === dispatchId(String(result.data.id)));
        const fresh = withCarriedOverTaskRef(toDispatchEntry(result.data), result.data, prior);
        this._entries.update(entries => {
          // `removed` rows are filtered out of the bulk load too — keeping the
          // rule in one shape means a removal arriving live behaves the same as
          // one that was already removed at page load.
          if (result.data.status === 'removed') {
            return entries.filter(e => e.id !== fresh.id);
          }
          return entries.some(e => e.id === fresh.id)
            ? entries.map(e => e.id === fresh.id ? fresh : e)
            : [...entries, fresh];
        });
      },
      error: () => { /* freshness top-up — keep what we have */ },
    });
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
   * Hide a finished run from the board, keeping the row.
   *
   * Was `DELETE /api/dispatch/{id}` — a hard delete behind a button labelled
   * "dismiss". With no foreign key from delivery_verifications that silently
   * orphaned the run's verdict, and it destroyed the record of an attempt the
   * pipeline made. Now POST /{id}/dismiss, the same soft hide the
   * notification bar has always used, so the word means one thing.
   *
   * The real DELETE still exists on the API for rows that genuinely should
   * not have been written; nothing in the dashboard calls it.
   */
  dismiss(id: DispatchId): void {
    const prior = this.getById(id);
    if (!prior) return;
    if (!(TERMINAL_STATUSES as readonly string[]).includes(prior.status)) {
      this.toast.error(`Can't dismiss a ${prior.status.replace('_', ' ')} dispatch`);
      return;
    }

    withOptimisticRemove(this._entries, this.toast, {
      prior,
      request: this.http.post<void>(
        `${environment.dashboardApiUrl}/api/dispatch/${encodeURIComponent(id)}/dismiss`, {},
      ),
      errorMessage: 'Dismiss failed — entry restored',
      seedMode: isSeedMode(),
      onSuccess: () => this.toast.success('Run hidden — the record is kept'),
    });
  }

  /**
   * Bulk-hide every entry whose status is in the requested terminal set.
   * Used by column-level "dismiss all" gestures. Was a bulk DELETE, which
   * destroyed the record of every run in a column — and the verifier verdicts
   * pointing at them, which have no foreign key to stop it.
   *
   * Statuses outside the terminal set are dropped at the boundary; the
   * server filters again as defence in depth.
   */
  dismissTerminal(statuses: readonly TerminalStatus[]): void {
    const filteredStatuses = statuses.filter(s => (TERMINAL_STATUSES as readonly string[]).includes(s));
    if (filteredStatuses.length === 0) return;

    const targets = this._entries().filter(e => (filteredStatuses as readonly string[]).includes(e.status));
    if (targets.length === 0) return;

    if (isSeedMode()) {
      this._entries.update(es => es.filter(e => !(filteredStatuses as readonly string[]).includes(e.status)));
      this.toast.success(`${targets.length} hidden`);
      return;
    }

    const prior = this._entries();
    this._entries.update(es => es.filter(e => !(filteredStatuses as readonly string[]).includes(e.status)));

    this.http
      .post<{ dismissed: number }>(
        `${environment.dashboardApiUrl}/api/dispatch/dismiss-terminal`,
        { statuses: filteredStatuses },
      )
      .subscribe({
        next: (res) => this.toast.success(`${res.dismissed} hidden — the records are kept`),
        error: () => {
          this._entries.set(prior);
          this.toast.error('Bulk dismiss failed — entries restored');
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

/**
 * Restore `task_title` / `task_seq` a single-row refresh couldn't supply.
 *
 * Absent (the field is missing from the payload) means "this endpoint doesn't
 * know", so the prior value stands. An explicit `null` means the vault item
 * genuinely has no title/seq, and overwrites. Exported for the spec.
 *
 * @param fresh   the newly mapped entry
 * @param raw     the wire payload, needed to tell absent from null
 * @param prior   the entry already in the store, if any
 * @returns the entry to store
 */
export function withCarriedOverTaskRef(
  fresh: DispatchQueueEntry,
  raw: Pick<ApiDispatchEntry, 'task_title' | 'task_seq'>,
  prior: DispatchQueueEntry | undefined,
): DispatchQueueEntry {
  if (!prior) return fresh;
  return {
    ...fresh,
    task_title: raw.task_title === undefined ? prior.task_title : fresh.task_title,
    task_seq:   raw.task_seq   === undefined ? prior.task_seq   : fresh.task_seq,
  };
}

function toDispatchEntry(a: ApiDispatchEntry): DispatchQueueEntry {
  return {
    id: dispatchId(String(a.id)),
    task_id: vaultItemId(a.task_id),
    skill: skillId(a.skill ?? a.agent_type),       // fall back to agent_type when skill not set
    status: narrowStatus(a.status),
    // Raw status preserved alongside the narrowed one — the commission board
    // needs proposed/rejected, which narrowStatus collapses into approved/failed.
    db_status: a.status,
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
