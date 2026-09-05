/**
 * Tick maths for `UiTallyStrip`, kept out of the component so it can be tested
 * without a template — the component is a `@for` over what these return.
 */

export type TallySize = 'sm' | 'md' | 'lg';
export type TallyVariant = 'inset' | 'bleed';

export interface TallyTick {
  /** False for the greyed remainder drawn when `showEmpty` is on. */
  readonly filled: boolean;
  /** Starts a new group — renders the wider gap that makes weeks countable. */
  readonly gap: boolean;
  /** Percentage of the tint remaining in this tick's mix; 100 at the first, 0 at the cap. */
  readonly tintShare: number;
}

/**
 * Share of the tint left in tick `index`, as a whole percentage.
 *
 * Linear from 100 at the first tick to 0 at the cap. A cap of 1 is degenerate
 * (no range to interpolate over) and yields a pure-tint single tick.
 *
 * @param index 1-based tick position
 * @param cap   tick count at which the tint is fully spent
 * @returns 0..100
 */
export function tintShare(index: number, cap: number): number {
  if (cap <= 1) return 100;
  const t = Math.min(1, Math.max(0, (index - 1) / (cap - 1)));
  return Math.round((1 - t) * 100);
}

/**
 * The ticks to draw for a count.
 *
 * @param count     units to fill; clamped at zero and capped
 * @param cap       maximum filled ticks
 * @param groupBy   insert a wider gap every n ticks; 0 disables grouping
 * @param showEmpty pad to `cap` with unfilled ticks so the runway is visible
 */
export function tallyTicks(
  count: number,
  cap: number,
  groupBy: number,
  showEmpty: boolean,
): TallyTick[] {
  const filled = Math.min(Math.max(0, Math.floor(count)), cap);
  const total = showEmpty ? cap : filled;
  const ticks: TallyTick[] = [];
  for (let i = 1; i <= total; i++) {
    ticks.push({
      filled: i <= filled,
      gap: groupBy > 0 && i > 1 && (i - 1) % groupBy === 0,
      tintShare: tintShare(i, cap),
    });
  }
  return ticks;
}
