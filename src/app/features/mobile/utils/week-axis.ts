/**
 * A continuous 7-day axis ending on `endIso`, with per-day values looked up
 * from sparse API rows (daily endpoints omit zero days). Weekday labels —
 * on a phone-width chart, "MM-DD" x7 is illegible.
 *
 * Self-contained (no @shared runtime imports) so it stays testable under the
 * repo's bare vitest setup, which resolves path aliases only for types.
 */
export function weekAxis<T>(
  endIso: string,
  rows: readonly T[],
  dateOf: (row: T) => string,
  valueOf: (row: T) => number,
): { labels: string[]; values: number[] } {
  const byDate = new Map(rows.map((r) => [dateOf(r), valueOf(r)]));
  const labels: string[] = [];
  const values: number[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = shiftDay(endIso, -i);
    labels.push(weekdayLabel(date));
    values.push(byDate.get(date) ?? 0);
  }
  return { labels, values };
}

function shiftDay(iso: string, deltaDays: number): string {
  // Noon UTC sidesteps DST edges; mirrors @shared shiftIsoDay.
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

function weekdayLabel(iso: string): string {
  // Noon UTC pins the weekday regardless of local offset.
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' });
}
