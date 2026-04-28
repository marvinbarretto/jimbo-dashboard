// Card sort logic for kanban views (and any future projection that needs
// "operator-relevant order"). Lives in domain so the dispatcher, the
// kanban, and a hypothetical "today" view all agree on the rule.
//
// Default policy (SortMode='priority'):
//   1. effective_priority ascending (P0 first, P3 last)
//   2. items with no priority sort to the bottom of their bucket
//   3. ties broken by created_at descending (newest first within the same priority)
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

export function compareCardsForKanban(a: VaultItem, b: VaultItem): number {
  const pa = effectivePriority(a);
  const pb = effectivePriority(b);
  if (pa !== pb) {
    if (pa === null) return 1;
    if (pb === null) return -1;
    return pa - pb;
  }
  return b.created_at.localeCompare(a.created_at);
}

// Returns a comparator for the given sort mode. Sort is always within a
// column — the kanban never reorders cards across columns.
export function compareCardsBy(mode: SortMode): (a: VaultItem, b: VaultItem) => number {
  switch (mode) {
    case 'priority': return compareCardsForKanban;
    case 'newest':   return (a, b) => b.created_at.localeCompare(a.created_at) || b.seq - a.seq;
    case 'oldest':   return (a, b) => a.created_at.localeCompare(b.created_at) || a.seq - b.seq;
    case 'fresh':    return (a, b) => {
      const latA = a.latest_activity_at ?? a.created_at;
      const latB = b.latest_activity_at ?? b.created_at;
      return latB.localeCompare(latA) || b.seq - a.seq;
    };
    case 'stale':    return (a, b) => {
      const latA = a.latest_activity_at ?? a.created_at;
      const latB = b.latest_activity_at ?? b.created_at;
      return latA.localeCompare(latB) || a.seq - b.seq;
    };
    case 'stuck':    return (a, b) => {
      const da = a.days_in_column ?? 0;
      const db = b.days_in_column ?? 0;
      return db - da || a.seq - b.seq; // longest stuck first
    };
  }
}
