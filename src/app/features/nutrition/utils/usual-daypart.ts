import { daypartAt, type Daypart } from '@shared/utils/daypart';
import { usualKey, type Usual } from '../data-access/usuals';

/**
 * Time-of-day ranking for the "usuals" quick-log grid.
 *
 * The frequents endpoint ranks by all-time count and returns a single
 * `last_logged_at`, so it can't know that granola is a 14:00 habit and beer is
 * a 21:00 one. This buckets the raw log history by daypart and re-sorts the
 * candidates, so the grid offers what's actually plausible right now.
 *
 * Nutrition-side rather than mobile-side on purpose: the desktop day view and a
 * future server-side `?daypart=` should be able to mirror the same rule.
 */

/** The two fields the histogram needs — structural, so no service import. */
export interface DatedFoodEntry {
  readonly raw_text: string;
  readonly logged_at: string;
}

export interface DaypartCounts {
  readonly morning: number;
  readonly midday: number;
  readonly evening: number;
  readonly total: number;
}

export type DaypartHistogram = ReadonlyMap<string, DaypartCounts>;

/**
 * How much a log in the current daypart outweighs one at any other time. High
 * enough to lift a genuine habit above raw frequency, low enough that a
 * long-standing favourite doesn't fall off the grid on its quiet half of the day.
 */
export const DAYPART_WEIGHT = 3;

export function buildDaypartHistogram(entries: readonly DatedFoodEntry[]): DaypartHistogram {
  const hist = new Map<string, { morning: number; midday: number; evening: number; total: number }>();
  for (const entry of entries) {
    // Same key as the chips — otherwise the histogram and the grid disagree
    // about whether "1 pale ale" and "3 pale ale" are the same drink.
    const key = usualKey(entry.raw_text);
    if (!key) continue;
    const at = new Date(entry.logged_at);
    if (Number.isNaN(at.getTime())) continue;
    const bucket = hist.get(key) ?? { morning: 0, midday: 0, evening: 0, total: 0 };
    bucket[daypartAt(at)] += 1;
    bucket.total += 1;
    hist.set(key, bucket);
  }
  return hist;
}

/**
 * Re-sorts candidates for the daypart and truncates to `max`.
 *
 * Score is `daypartCount * DAYPART_WEIGHT + total`, so an item never logged at
 * this time of day still ranks on overall frequency instead of vanishing — a
 * fresh install with an empty histogram degrades to the input order rather than
 * an empty grid.
 */
export function rankUsualsForDaypart(
  usuals: readonly Usual[],
  hist: DaypartHistogram,
  daypart: Daypart,
  max: number,
): Usual[] {
  const score = (u: Usual): number => {
    const counts = hist.get(u.key);
    if (!counts) return 0;
    return counts[daypart] * DAYPART_WEIGHT + counts.total;
  };
  // Array.prototype.sort is stable, so equal scores keep buildUsuals' order —
  // which is already frequency-then-recency ranked.
  return [...usuals].sort((a, b) => score(b) - score(a)).slice(0, Math.max(0, max));
}
