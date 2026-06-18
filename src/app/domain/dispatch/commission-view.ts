import type { ActorId, VaultItemId } from '../ids';
import type { DispatchQueueEntry, PrState } from './dispatch-queue-entry';

// Per-ITEM view of the commission (code/PR) pipeline — the data shape behind the
// rebuilt execution board. The current board renders one card per dispatch row,
// mixing automatic groom/recon passes with real commissions, so a merely-groomed
// item shows several "completed" cards. This module collapses that to ONE entry
// per vault item, commission-flow only, with the item's current stage + the full
// commission history for drill-down.
//
// Pure and component-free by design (mirrors readiness.ts / transitions.ts): the
// service wraps it in a computed signal, the board renders the result.

// The honest stage of an item's commission, derived from its latest commission
// dispatch + PR state.
//
// NOTE: `proposed` and `rejected` are NOT distinguished yet. The dispatch mapper
// currently narrows the DB status (proposed→approved, rejected→failed), so those
// collapse before they reach here. T1.3 carries the raw status and splits them
// out — at which point this union grows and `commissionStage` gains those arms.
export type CommissionStage =
  | 'approved'    // queued / awaiting pickup
  | 'running'     // executor working
  | 'pr_open'     // PR open or draft — awaiting review + merge
  | 'merged'      // PR merged — shipped
  | 'completed'   // finished but PR state unknown (worker didn't report pr_state)
  | 'failed';     // errored / reaped

export interface CommissionItem {
  taskId:    VaultItemId;
  taskSeq:   number | null;
  taskTitle: string | null;
  stage:     CommissionStage;
  executor:  ActorId | null;                  // owner of the latest commission
  latest:    DispatchQueueEntry;              // newest commission dispatch
  history:   readonly DispatchQueueEntry[];   // every commission dispatch, newest-first
}

// PR-state → stage, for a dispatch that has finished (status='completed').
// null/closed/unknown means "completed, PR status not reported" — pr_url is
// currently always null server-side (hub autonomy-pilot #14), so this is common.
function stageFromPr(pr: PrState | null | undefined): CommissionStage {
  switch (pr) {
    case 'merged':       return 'merged';
    case 'open':
    case 'draft':        return 'pr_open';
    default:             return 'completed';
  }
}

// Stage of a single commission dispatch. Exhaustive over DispatchStatus.
export function commissionStage(e: DispatchQueueEntry): CommissionStage {
  switch (e.status) {
    case 'approved':
    case 'dispatching': return 'approved';
    case 'running':     return 'running';
    case 'failed':      return 'failed';
    case 'completed':   return stageFromPr(e.pr_state);
  }
}

// Collapse a flat dispatch list into one CommissionItem per vault item.
// Grooming/recon dispatches are excluded entirely; only `flow === 'commission'`
// counts. History is newest-first; `latest` and the derived `stage` reflect the
// most recent commission attempt. Items are returned most-recently-touched first.
export function groupCommissions(entries: readonly DispatchQueueEntry[]): CommissionItem[] {
  const byTask = new Map<string, DispatchQueueEntry[]>();
  for (const e of entries) {
    if (e.flow !== 'commission') continue;
    const key = e.task_id as string;
    const arr = byTask.get(key);
    if (arr) arr.push(e);
    else byTask.set(key, [e]);
  }

  const items: CommissionItem[] = [];
  for (const group of byTask.values()) {
    const history = [...group].sort((a, b) => b.created_at.localeCompare(a.created_at));
    const latest = history[0];
    items.push({
      taskId:    latest.task_id,
      taskSeq:   latest.task_seq ?? null,
      taskTitle: latest.task_title ?? null,
      stage:     commissionStage(latest),
      executor:  latest.executor,
      latest,
      history,
    });
  }
  return items.sort((a, b) => b.latest.created_at.localeCompare(a.latest.created_at));
}
