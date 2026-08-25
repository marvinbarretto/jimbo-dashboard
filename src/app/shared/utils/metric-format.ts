/**
 * Shared number formatting for the metric primitives.
 *
 * Lives outside the components because `ui-metric` and `ui-delta` must format
 * the *same* quantity identically — a tile reading "3h 12m" above a delta
 * reading "-64" would be two facts about one number in two languages. The
 * caller picks the unit once and both sides obey it.
 */

/** The quantities the journal actually measures. Add a case, get a formatter. */
export type MetricUnit = 'count' | 'minutes' | 'currency' | 'grams' | 'kg';

/**
 * Renders a metric's absolute value in its unit.
 *
 * @param value - The raw measurement
 * @param unit - How to read it
 * @returns Display string, no sign for positives
 */
export function formatMetric(value: number, unit: MetricUnit): string {
  switch (unit) {
    case 'minutes': return formatMinutesCompact(value);
    // Fleet spend runs to fractions of a cent; a 2dp format would render most
    // days as $0.00 and make the whole tile useless.
    case 'currency': return `$${value < 1 ? value.toFixed(4) : value.toFixed(2)}`;
    case 'grams': return `${Math.round(value)}g`;
    case 'kg': return `${Math.round(value).toLocaleString('en-GB')}kg`;
    case 'count': return Math.round(value).toLocaleString('en-GB');
  }
}

/**
 * Renders a *difference* — always signed, always positive-magnitude words.
 *
 * @param diff - Signed difference (current minus reference)
 * @param unit - How to read it
 * @returns Display string with an explicit + or −
 */
export function formatMetricDelta(diff: number, unit: MetricUnit): string {
  const sign = diff > 0 ? '+' : '−';
  return `${sign}${formatMetric(Math.abs(diff), unit)}`;
}

/**
 * Percentage change against a reference.
 *
 * @param current - Today's value
 * @param reference - What it is being compared to
 * @returns Signed percent string, or null when the reference is zero (a change
 *   from nothing is infinite, not a percentage — callers must say "none
 *   yesterday" instead)
 */
export function formatMetricPercent(current: number, reference: number): string | null {
  if (reference === 0) return null;
  const pct = Math.round(((current - reference) / Math.abs(reference)) * 100);
  return `${pct > 0 ? '+' : pct < 0 ? '−' : ''}${Math.abs(pct)}%`;
}

/**
 * Minutes as hours-and-minutes, rounded to the nearest minute.
 *
 * Deliberately not `datetime.utils`' `formatMinutes`: that one takes an integer
 * and would render a 38.6-minute delta as "38.6m".
 *
 * @param minutes - Duration in minutes, possibly fractional
 * @returns e.g. "3h 12m", "48m", "2h"
 */
function formatMinutesCompact(minutes: number): string {
  const total = Math.round(minutes);
  if (total < 60) return `${total}m`;
  const h = Math.floor(total / 60);
  const rem = total % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}
