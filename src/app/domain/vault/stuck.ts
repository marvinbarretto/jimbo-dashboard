// "Stuck" — how long has this item been sitting in its current grooming column?
//
// Different from staleness (which is "how old is the item overall"). A card can
// be young and stuck (just landed in `intake_rejected`, sat there 5 days) or old
// and not-stuck (created weeks ago but moved to its current column today).
//
// Stuck answers the operator's "I can act on this NOW" question — the column
// itself is the bottleneck, regardless of total item age. Directly addresses the
// procrastination angle: surface what's been sitting unused.

import { ageInDays } from './staleness';
import type { VaultItem } from './vault-item';
import type { VaultActivityEvent, GroomingStatusChangedEvent } from '../activity/activity-event';

// Threshold above which a card is considered "stuck" — visualised. Tunable;
// 3 days reflects the operator's natural rhythm (a working week on the high end).
export const STUCK_THRESHOLD_DAYS = 3;

// Returns the number of days since the item entered its current grooming column.
// Falls back to days-since-created when no `grooming_status_changed` event matches
// the current status — typical for items still in their original `ungroomed` state.
//
// `events` is expected to be sorted by `at` desc (the activity-events service
// already does this); `.find` then returns the most recent match in O(1) on the head.
export function stuckDays(
  item: Pick<VaultItem, 'grooming_status' | 'created_at'>,
  events: readonly VaultActivityEvent[],
  nowIso: string = new Date().toISOString(),
): number {
  const transition = events.find(
    (e): e is GroomingStatusChangedEvent =>
      e.type === 'grooming_status_changed' && e.to === item.grooming_status,
  );
  const enteredAt = transition?.at ?? item.created_at;
  return ageInDays(enteredAt, nowIso);
}

// True when stuck duration exceeds the threshold. Use to drive a visible hint
// on the card; below the threshold the signal is just noise.
export function isStuck(days: number, threshold: number = STUCK_THRESHOLD_DAYS): boolean {
  return days >= threshold;
}
