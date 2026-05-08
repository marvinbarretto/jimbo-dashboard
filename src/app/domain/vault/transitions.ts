// The grooming-pipeline state machine, as data.
//
// Companion to vault-item.ts (which owns the GroomingStatus union and the
// canonical column order). This file owns transition policy: which moves
// are valid, why, and how to ask "is it OK to go from A to B?"
//
// Policy is ADVISORY at the operator boundary (kanban drag-drop) and STRICT
// at the agent / dispatch-claim boundary. Operator gestures should pass
// `force` so the kanban can absorb exploration moves; programmatic transitions
// from skills, the dispatch executor, or VaultItemCommands should respect the
// table verbatim.

import type { GroomingStatus } from './vault-item';

// Each row reads "from this state, you may transition to any of these states".
// `satisfies` keyed-by-status ensures every member of GroomingStatus appears
// once — adding a new state to the union without updating this table fails
// to compile. Same compile-time exhaustiveness guarantee that GROOMING_STATUS_LABELS
// gives for display strings.
//
// Backward edges (e.g. ready → decomposed) are deliberate operator escape hatches —
// "I approved this too eagerly, send it back". They're not used by skills.
// `needs_rework` can rejoin anywhere because the new owner picks up the work
// from whichever stage it's actually at, not always from the start.
export const ALLOWED_TRANSITIONS = {
  ungroomed:        ['intake_rejected', 'intake_complete', 'needs_rework'],
  intake_rejected:  ['intake_complete', 'ungroomed', 'needs_rework'],
  intake_complete:  ['classified', 'ungroomed', 'needs_rework'],
  classified:       ['decomposed', 'intake_complete', 'needs_rework'],
  decomposed:       ['ready', 'classified', 'needs_rework'],
  ready:            ['decomposed', 'needs_rework'],
  needs_rework:     ['ungroomed', 'intake_complete', 'classified', 'decomposed', 'ready'],
} as const satisfies Record<GroomingStatus, readonly GroomingStatus[]>;

export function isAllowedTransition(from: GroomingStatus, to: GroomingStatus): boolean {
  if (from === to) return true; // no-op is always fine; callers short-circuit anyway
  return (ALLOWED_TRANSITIONS[from] as readonly GroomingStatus[]).includes(to);
}
