/**
 * Trailing rolling median — index i is the median of the current value and
 * up to `windowSize - 1` preceding values. Unlike a rolling mean, a single
 * outlier day (a big night out, a misattributed late entry) barely moves
 * it, since the middle value ignores extremes rather than being pulled by
 * them. Near the start of the series, where fewer than `windowSize` values
 * are available, it takes the median of whatever exists.
 *
 * @param values - Day-ordered values (missing days should already be 0, not omitted)
 * @param windowSize - Trailing window length, e.g. 7 for a 7-day median
 * @returns One median value per input value
 */
export function rollingMedian(values: readonly number[], windowSize: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    const window = [...values.slice(start, i + 1)].sort((a, b) => a - b);
    const mid = Math.floor(window.length / 2);
    out.push(window.length % 2 === 0 ? (window[mid - 1] + window[mid]) / 2 : window[mid]);
  }
  return out;
}
