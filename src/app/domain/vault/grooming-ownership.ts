import { wellKnownActorId, type ActorId } from '../ids';
import type { GroomingStatus } from './vault-item';

// Who is expected to act on an item at each grooming state. Single source of
// truth for the auto-reassign rule on grooming transitions and for the
// "Waiting on …" label in next-action.
//
// Policy (chosen 2026-05-14):
//   ungroomed         → boris   (runs intake-quality)
//   intake_rejected   → marvin  (must answer the questions intake raised)
//   intake_complete   → boris   (runs vault-classify)
//   classified        → kipper   (runs vault-decompose)
//   decomposed        → marvin  (approves the decomposition)
//   needs_rework      → marvin  (decides where the rework goes)
//   ready             → null    (keep current owner; dispatcher picks executor)
//   settled           → null    (terminal; nobody is working it, owner is history)
//
// `null` means "transition does not force a reassignment". The current owner
// stays put. Used for `ready`, which is the handoff to the dispatch queue.
export const OWNER_BY_GROOMING_STATE: Record<GroomingStatus, ActorId | null> = {
  ungroomed:        wellKnownActorId('boris'),
  intake_rejected:  wellKnownActorId('marvin'),
  intake_complete:  wellKnownActorId('boris'),
  classified:       wellKnownActorId('kipper'),
  decomposed:       wellKnownActorId('marvin'),
  needs_rework:     wellKnownActorId('marvin'),
  ready:            null,
  // Terminal. A reference item or an epic has left the pipeline — reassigning it
  // would imply someone still owes work on it. Keep whoever last held it.
  settled:          null,
};

// Given a state and the current owner, returns the actor who SHOULD own the
// item once it reaches that state — or `null` if no reassignment is needed.
// Returning null when the current owner already matches lets callers skip a
// redundant PATCH/event pair.
export function ownerForGroomingState(
  status: GroomingStatus,
  currentOwner: ActorId | null,
): ActorId | null {
  const canonical = OWNER_BY_GROOMING_STATE[status];
  if (canonical === null) return null;
  if (canonical === currentOwner) return null;
  return canonical;
}
