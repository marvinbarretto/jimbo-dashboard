import { wellKnownActorId, type ActorId } from '../ids';

// Single source of truth for "who is the human operator using this dashboard?".
//
// Today the dashboard is single-user (Marvin). Every feature that needs the
// current actor — for activity attribution, "is this mine?" filters, etc —
// imports this constant rather than hardcoding 'marvin' inline. When auth
// eventually lands, this becomes a signal driven by the auth store and
// every call site keeps working unchanged.
//
// Typed via wellKnownActorId so a typo is a compile error, not a silent
// runtime mismatch.
export const CURRENT_ACTOR_ID: ActorId = wellKnownActorId('marvin');
