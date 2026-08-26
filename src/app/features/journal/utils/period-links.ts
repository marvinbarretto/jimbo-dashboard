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

/**
 * Which horizons each journal domain offers.
 *
 * Overview stops at a week deliberately. A month is too long to act on — by
 * the time a bad one is visible it is over — and a view you cannot act on is a
 * record rather than a prompt. Days and weeks are the horizons where seeing
 * the number can still change it.
 *
 * Jimbo keeps the month because its cycle genuinely is monthly: spend is
 * billed that way, so the period is the unit rather than an arbitrary window.
 *
 * The month code stays in place throughout — the endpoint, the routes and the
 * period arithmetic all still handle it, so restoring a domain's month view is
 * one entry here rather than a rebuild. A month URL typed by hand still
 * renders; it simply is not offered.
 */
const DOMAIN_GRANULARITIES: Readonly<Record<string, readonly JournalGranularity[]>> = {
  overview: ['day', 'week'],
  work: ['day', 'week'],
  body: ['day', 'week'],
  phone: ['day', 'week'],
  jimbo: ['day', 'week', 'month'],
  reflect: ['day'],
};

const ALL_GRANULARITIES: readonly JournalGranularity[] = ['day', 'week', 'month'];

/**
 * The horizons a domain offers, in order.
 *
 * @param domain - Journal domain key (overview, work, body, jimbo, phone…)
 * @returns Supported granularities; all three for an unknown domain
 */
export function granularitiesFor(domain: string): readonly JournalGranularity[] {
  return DOMAIN_GRANULARITIES[domain] ?? ALL_GRANULARITIES;
}

/**
 * The granularity a domain should land on when arriving from another.
 *
 * Switching Work's week to Overview keeps the week; switching Work's month to
 * Overview falls back rather than landing on a horizon the page will not offer
 * a way out of.
 *
 * @param domain - Destination domain
 * @param granularity - The granularity being carried over
 * @returns The nearest supported granularity, coarsest-first
 */
export function resolveGranularity(
  domain: string,
  granularity: JournalGranularity,
): JournalGranularity {
  const supported = granularitiesFor(domain);
  if (supported.includes(granularity)) return granularity;
  return supported.includes('week') ? 'week' : 'day';
}

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
