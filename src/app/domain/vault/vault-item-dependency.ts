import type { VaultItemId } from '../ids';

// A blocking dependency between two vault items.
// "blocker must be in state 'done' before blocked can move past readiness."
// Readiness gains a conditional check when an item has blockers — same pattern as open_questions.
//
// Only one kind for MVP — 'blocks'. Future kinds ('relates_to', 'duplicate_of') would either
// extend this with a `kind` field or split into sibling junctions; decide when a real case
// demands them.

export interface VaultItemDependency {
  blocker_id: VaultItemId;   // must complete first
  blocked_id: VaultItemId;   // waits on blocker
  created_at: string;
}

export type CreateVaultItemDependencyPayload = Omit<VaultItemDependency, 'created_at'>;
