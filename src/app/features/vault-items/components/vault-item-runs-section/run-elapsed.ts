/**
 * Wall-clock time a dispatch run occupied, formatted for display.
 *
 * Pure and separate from the component so it can be tested without a TestBed,
 * and with no ambient clock: both ends come from the row, so there is nothing
 * to fake.
 *
 * Returns null when the run never started or never finished. That is deliberate
 * — a running dispatch gets no number rather than a "duration so far", because
 * a figure that grows while nobody is watching reads as progress. Dispatch 5029
 * spent 17 minutes announcing it would resume and never did.
 *
 * @param startedAt   ISO timestamp the executor claimed the row, or null.
 * @param completedAt ISO timestamp the run finished, or null.
 * @returns e.g. `"47s"`, `"3m"`, `"1m 57s"`, or null when it cannot be computed.
 */
export function runElapsed(startedAt: string | null, completedAt: string | null): string | null {
  if (!startedAt || !completedAt) return null;

  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  // NaN from an unparseable timestamp, and negative from clock skew between the
  // worker and the API, both mean "we don't know" — not "0s", which would read
  // as an instant success.
  if (!Number.isFinite(ms) || ms < 0) return null;

  const secs = Math.round(ms / 1000);
  if (secs < 60) return `${secs}s`;

  const mins = Math.floor(secs / 60);
  const rem = secs % 60;
  return rem === 0 ? `${mins}m` : `${mins}m ${rem}s`;
}
