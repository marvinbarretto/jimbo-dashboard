/**
 * Morning / midday / evening — the single definition, used by the home screen's
 * NOW card and by the daypart re-ranking of the quick-log grid.
 *
 * Shared rather than phone-local: nutrition ranks its "usuals" by daypart too,
 * and a copy per feature is how two surfaces start disagreeing about when the
 * evening starts. Sits beside datetime.utils for the same reason.
 *
 * Zoned to Europe/London, never the device: the phone travels, the data doesn't.
 * `getHours()` would silently return a different daypart abroad and re-rank the
 * food grid against the wrong half of the day.
 *
 * Evening runs to 04:00 rather than midnight, matching LOGICAL_DAY_CUTOVER_HOURS
 * in datetime.utils. Ending it at midnight would make the close-out card vanish
 * while injectLogicalToday() still reports the previous day — four hours of the
 * screen contradicting its own data.
 */

export type Daypart = 'morning' | 'midday' | 'evening';

const LONDON = 'Europe/London';

/** First hour of each daypart. Evening wraps past midnight to MORNING_FROM. */
export const DAYPART_FROM = { morning: 4, midday: 12, evening: 18 } as const;

// hourCycle 'h23' rather than hour12:false — en-GB renders midnight as "24"
// under the latter, which would land 00:30 in the wrong bucket.
const HOUR_FORMAT = new Intl.DateTimeFormat('en-GB', {
  hour: 'numeric',
  hourCycle: 'h23',
  timeZone: LONDON,
});

/** Hour-of-day (0–23) in Europe/London. */
export function londonHour(now: Date): number {
  return Number(HOUR_FORMAT.format(now)) % 24;
}

export function daypartAt(now: Date): Daypart {
  const h = londonHour(now);
  if (h >= DAYPART_FROM.evening || h < DAYPART_FROM.morning) return 'evening';
  if (h >= DAYPART_FROM.midday) return 'midday';
  return 'morning';
}
