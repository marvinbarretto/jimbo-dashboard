// How "old" a vault item is, expressed as a continuous 0..1 ratio.
//
// Two interpretations of an old card and we deliberately do NOT try to
// disambiguate them automatically:
//   1. "Stale"      — out of date, should be killed or archived
//   2. "Needs help" — important, blocked, the operator (or jimbo) needs to act
//
// Both look the same on the board; the operator reads other signals on the card
// (priority, owner, blockers, open questions) to decide. The staleness signal
// answers "how long has this been sitting?" — the *interpretation* stays human.
//
// Continuous (not bucketed) so the visualization can be a smooth gradient via a
// single CSS variable rather than a switch over named levels. The component sets
// `--age-norm` on the card and CSS interpolates colour from there.

import type { VaultItem } from './vault-item';

// Days at which the staleness visual reaches its ceiling. Cards older than this
// render identical to "60-day-old" cards — past that point a steeper gradient
// just produces noise. 60 fits realistic operator backlog: items at 30 days
// look mid-gradient (warning), items at 50 days look near-rotting, items past
// 60 are visually capped (signal saturated).
export const STALENESS_CEILING_DAYS = 60;

// Days as a float — useful for tooltip display ("4d ago") and for any logic
// that wants the raw number.
export function ageInDays(
  referenceIso: string,
  nowIso: string = new Date().toISOString(),
): number {
  const ms = new Date(nowIso).getTime() - new Date(referenceIso).getTime();
  return ms / (1000 * 60 * 60 * 24);
}

// Returns a 0..1 ratio: 0 = fresh, 1 = at or past the ceiling. Linear because
// the visual mapping (color-mix in oklch) handles perceptual non-linearity for us.
export function stalenessRatio(
  referenceIso: string,
  nowIso?: string,
  ceilingDays: number = STALENESS_CEILING_DAYS,
): number {
  const days = ageInDays(referenceIso, nowIso);
  return Math.min(1, Math.max(0, days / ceilingDays));
}

// Convenience for a VaultItem with an optional `lastActivityAt` override
// (typically MAX(activity_events.at) for the item). Falls back to `created_at`
// so callers without event data still get a signal.
export function stalenessRatioFor(
  item: Pick<VaultItem, 'created_at'>,
  lastActivityAt?: string | null,
  nowIso?: string,
): number {
  return stalenessRatio(lastActivityAt ?? item.created_at, nowIso);
}
