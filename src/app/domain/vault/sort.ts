// Card sort logic for kanban views (and any future projection that needs
// "operator-relevant order"). Lives in domain so the dispatcher, the
// kanban, and a hypothetical "today" view all agree on the rule.
//
// Default policy:
//   1. effective_priority ascending (P0 first, P3 last)
//   2. items with no priority sort to the bottom of their bucket
//   3. ties broken by created_at descending (newest first within the same priority)
//
// Manual reorder via drag is deliberately NOT supported — see whiteboard.
// If the operator wants a different order, they should re-prioritise (the
// data signal) rather than override the view (a fragile per-user pref).

import type { VaultItem } from './vault-item';
import { effectivePriority } from './readiness';

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
