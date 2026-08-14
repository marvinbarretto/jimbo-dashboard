// Card sort logic for kanban views (and any future projection that needs
// "operator-relevant order"). Lives in domain so the dispatcher, the
// kanban, and a hypothetical "today" view all agree on the rule.
//
// Default policy (SortMode='priority'):
//   1. effective_priority ascending (P0 first, P3 last)
//   2. items with no priority sort to the bottom of their bucket
//   3. ties broken by created_at ASCENDING (oldest first within the same priority)
//
// (3) changed 2026-08-14. It used to be newest-first, which meant a single
// bulk decomposition owned the head of its priority band the day it ran — five
// decompositions supplied 104 of the 216 P1 cards on the execution board, and
// nothing that had been waiting was reachable. Oldest-first makes a priority
// band behave like a queue. Anyone who genuinely wants recency has the
// 'newest' mode; the default should not silently reward being recent.
//
// Manual reorder via drag is deliberately NOT supported — see whiteboard.
// If the operator wants a different order, they should re-prioritise (the
// data signal) rather than override the view (a fragile per-user pref).

import type { VaultItem } from './vault-item';
import { effectivePriority } from './readiness';

export type SortMode = 'priority' | 'newest' | 'oldest' | 'fresh' | 'stale' | 'stuck';

export const SORT_OPTIONS: readonly { value: SortMode; label: string }[] = [
  { value: 'priority', label: 'Priority' },
  { value: 'newest',   label: 'Newest' },
  { value: 'oldest',   label: 'Oldest' },
  { value: 'fresh',    label: 'Fresh' },
  { value: 'stale',    label: 'Stale' },
  { value: 'stuck',    label: 'Stuck' },
];

// The minimum a card must expose to be sorted. Execution's board cards are a
// union of vault items and commissions, so they can't satisfy VaultItem — but
// they can satisfy this. Keeping one comparator set behind a structural type is
// what stops the two boards drifting into two different notions of "urgent".
export interface SortableCard {
  /** Effective priority (manual over ai). `null` = unset, sinks to the bottom. */
  readonly priority:         number | null;
  readonly createdAt:        string;
  readonly seq:              number;
  readonly latestActivityAt?: string | null;
  readonly daysInColumn?:    number | null;
}

export function compareSortableBy(
  mode: SortMode,
): (a: SortableCard, b: SortableCard) => number {
  switch (mode) {
    case 'priority': return (a, b) => {
      if (a.priority !== b.priority) {
        if (a.priority === null) return 1;
        if (b.priority === null) return -1;
        return a.priority - b.priority;
      }
      // Within a priority band, oldest first. Newest-first lets one bulk
      // decomposition own the head of a band the day it runs, which buries
      // everything that has been waiting — the opposite of what a queue is for.
      return a.createdAt.localeCompare(b.createdAt) || a.seq - b.seq;
    };
    case 'newest':   return (a, b) => b.createdAt.localeCompare(a.createdAt) || b.seq - a.seq;
    case 'oldest':   return (a, b) => a.createdAt.localeCompare(b.createdAt) || a.seq - b.seq;
    case 'fresh':    return (a, b) => {
      const latA = a.latestActivityAt ?? a.createdAt;
      const latB = b.latestActivityAt ?? b.createdAt;
      return latB.localeCompare(latA) || b.seq - a.seq;
    };
    case 'stale':    return (a, b) => {
      const latA = a.latestActivityAt ?? a.createdAt;
      const latB = b.latestActivityAt ?? b.createdAt;
      return latA.localeCompare(latB) || a.seq - b.seq;
    };
    case 'stuck':    return (a, b) => {
      const da = a.daysInColumn ?? 0;
      const db = b.daysInColumn ?? 0;
      return db - da || a.seq - b.seq; // longest stuck first
    };
  }
}

/** Project a vault item onto the shape the comparators read. */
export function toSortableCard(item: VaultItem): SortableCard {
  return {
    priority:         effectivePriority(item),
    createdAt:        item.created_at,
    seq:              item.seq,
    latestActivityAt: item.latest_activity_at ?? null,
    daysInColumn:     item.days_in_column ?? null,
  };
}

export function compareCardsForKanban(a: VaultItem, b: VaultItem): number {
  return compareSortableBy('priority')(toSortableCard(a), toSortableCard(b));
}

// Returns a comparator for the given sort mode. Sort is always within a
// column — the kanban never reorders cards across columns.
export function compareCardsBy(mode: SortMode): (a: VaultItem, b: VaultItem) => number {
  const cmp = compareSortableBy(mode);
  return (a, b) => cmp(toSortableCard(a), toSortableCard(b));
}
