// Pure date helpers for the calendar board. Extracted so the day math behind
// drag-to-defer — which PATCHes real calendar events — is unit-testable in
// isolation, without standing up the component or its resources.

/** Local-time YYYY-MM-DD key for a Date — the board's day-bucket identity. */
export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Shift an ISO instant OR an all-day date string by whole days.
 *
 * All-day values (`YYYY-MM-DD`) shift in UTC and stay date-shaped. Timed
 * instants shift in LOCAL time so the wall-clock time-of-day is preserved
 * across a DST boundary (the point of "defer to tomorrow" is same time, next
 * day — not same UTC offset).
 */
export function shiftIsoDays(iso: string, days: number): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const d = new Date(`${iso}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
  }
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}
