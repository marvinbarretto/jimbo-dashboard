// Staleness: how long a vault item has been sitting without action.
//
// Two thresholds drive the visual:
//   STALE_DAYS   — a card that's been sitting this long deserves attention
//   ANCIENT_DAYS — beyond this, the visual is fully saturated (no point escalating further)
//
// Two normalised ratios are computed (0..1, sqrt-curved). The sqrt curve front-loads
// discrimination: a 2-day card and a 5-day card look clearly different, whereas a
// 25-day and 28-day card (both clearly ancient) look similar. That's the right tradeoff
// for an operator who mostly acts on recent items.
//
// The component sets --stale-norm and --ancient-norm on the card host so CSS can
// interpolate a single-hue (amber) gradient — deeper shade, no hue jump.

import type { VaultItem } from './vault-item';

export const STALE_DAYS   = 7;   // "this card needs attention"
export const ANCIENT_DAYS = 30;  // "this card is rotting"

// Days as a float — used for the age label tooltip ("4d ago").
export function ageInDays(
  referenceIso: string,
  nowIso: string = new Date().toISOString(),
): number {
  const ms = new Date(nowIso).getTime() - new Date(referenceIso).getTime();
  return ms / (1000 * 60 * 60 * 24);
}

// sqrt curve: steep early (2d vs 5d are clearly different), flattens at the ceiling.
function sqrtRatio(days: number, ceiling: number): number {
  return Math.min(1, Math.max(0, Math.sqrt(days / ceiling)));
}

// 0..1 over 0..STALE_DAYS — drives how much amber appears on the card.
export function staleNorm(
  item: Pick<VaultItem, 'created_at'>,
  lastActivityAt?: string | null,
  nowIso?: string,
): number {
  return sqrtRatio(ageInDays(lastActivityAt ?? item.created_at, nowIso), STALE_DAYS);
}

// 0..1 over 0..ANCIENT_DAYS — drives how deep the amber gets.
export function ancientNorm(
  item: Pick<VaultItem, 'created_at'>,
  lastActivityAt?: string | null,
  nowIso?: string,
): number {
  return sqrtRatio(ageInDays(lastActivityAt ?? item.created_at, nowIso), ANCIENT_DAYS);
}

// Kept for any callers outside the card (e.g. list views, tests).
export const STALENESS_CEILING_DAYS = ANCIENT_DAYS;
export function stalenessRatio(referenceIso: string, nowIso?: string): number {
  return sqrtRatio(ageInDays(referenceIso, nowIso), ANCIENT_DAYS);
}
export function stalenessRatioFor(
  item: Pick<VaultItem, 'created_at'>,
  lastActivityAt?: string | null,
  nowIso?: string,
): number {
  return stalenessRatio(lastActivityAt ?? item.created_at, nowIso);
}
