// Point-in-time preserving links between the journal's period granularities.
// Switching Day → Week lands on the week CONTAINING that day (not this week);
// switching a coarse period to a finer one prefers today when the period
// contains it, else the period's start.

// Relative import (not @shared alias): this module has RUNTIME imports and is
// exercised by bare `vitest run`, which has no tsconfig-path resolution.
import {
  type DayKey,
  type MonthKey,
  type WeekKey,
  dateFromDayKey,
  dayKeyFromDate,
  daysInMonth,
  daysInWeek,
  monthKeyFromDate,
  todayKey,
  weekKeyFromDate,
  weekStartFromKey,
} from '../../../shared/utils/date-keys';

export type JournalGranularity = 'day' | 'week' | 'month';

export interface PeerKeys {
  readonly day: DayKey;
  readonly week: WeekKey;
  readonly month: MonthKey;
}

export function peerKeys(granularity: JournalGranularity, key: string): PeerKeys {
  if (granularity === 'day') {
    const d = dateFromDayKey(key);
    return { day: key, week: weekKeyFromDate(d), month: monthKeyFromDate(d) };
  }
  if (granularity === 'week') {
    const days = daysInWeek(key);
    const day = days.includes(todayKey()) ? todayKey() : days[0]!;
    return { day, week: key, month: monthKeyFromDate(weekStartFromKey(key)) };
  }
  const days = daysInMonth(key);
  const day = days.includes(todayKey()) ? todayKey() : days[0]!;
  return { day, week: weekKeyFromDate(dateFromDayKey(day)), month: key };
}

/** True when the period identified by (granularity, key) contains today. */
export function periodContainsToday(granularity: JournalGranularity, key: string): boolean {
  const today = todayKey();
  if (granularity === 'day') return key === today;
  if (granularity === 'week') return daysInWeek(key).includes(today);
  return daysInMonth(key).includes(today);
}

export function currentKeyFor(granularity: JournalGranularity): string {
  const today = todayKey();
  if (granularity === 'day') return today;
  const d = dateFromDayKey(today);
  return granularity === 'week' ? weekKeyFromDate(d) : monthKeyFromDate(d);
}

// Re-export for convenience so pages can build day links without a second import.
export { dayKeyFromDate };
