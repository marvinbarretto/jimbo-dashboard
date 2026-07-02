import { shiftIsoDay } from '@shared/utils/datetime.utils';

export type TrackerPeriod = 'day' | 'week' | 'month';

export interface PeriodWindow {
  readonly start: string;
  readonly end: string;
  readonly elapsedDays: number;
  readonly label: string;
}

/**
 * Resolve a day/week/month window around an anchor day (YYYY-MM-DD). Weeks are
 * Monday-anchored; months are clamped to the real last day so the window never
 * spills into the next month. `elapsedDays` counts from the window start up to
 * `today` (clamped into the window), so averages reflect days actually lived —
 * the full span once the period has completed, a partial count while it's
 * still current.
 *
 * `today` defaults to `anchor` so a caller that's only ever describing "the
 * period containing `anchor`, as of `anchor`" (the common case) doesn't need
 * to pass it explicitly; a page browsing past periods should pass the real
 * current day.
 *
 * Pure (no clock) and exported for unit tests of the boundary maths.
 */
export function periodWindow(period: TrackerPeriod, anchor: string, today: string = anchor): PeriodWindow {
  if (period === 'day') {
    return { start: anchor, end: anchor, elapsedDays: 1, label: prettyDay(anchor) };
  }
  if (period === 'week') {
    const dow = new Date(`${anchor}T00:00:00Z`).getUTCDay(); // 0=Sun
    const backToMon = (dow + 6) % 7;
    const start = shiftIsoDay(anchor, -backToMon);
    const end = shiftIsoDay(start, 6);
    return { start, end, elapsedDays: elapsedDaysOf(start, end, today), label: `${prettyDay(start)} – ${prettyDay(end)}` };
  }
  const year = Number(anchor.slice(0, 4));
  const month = Number(anchor.slice(5, 7)); // 1-based
  const start = `${anchor.slice(0, 7)}-01`;
  // Day 0 of the next month is the last day of this one.
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const end = `${anchor.slice(0, 7)}-${String(lastDay).padStart(2, '0')}`;
  return { start, end, elapsedDays: elapsedDaysOf(start, end, today), label: prettyMonth(anchor) };
}

// Days from `start` to `today` inclusive, with `today` clamped into [start, end]
// — a period that's fully in the past reports its full span, one still in
// progress reports how much of it has actually happened.
function elapsedDaysOf(start: string, end: string, today: string): number {
  const clamped = today < start ? start : today > end ? end : today;
  const days = Math.round(
    (new Date(`${clamped}T00:00:00Z`).getTime() - new Date(`${start}T00:00:00Z`).getTime()) / 86_400_000,
  );
  return days + 1;
}

function prettyDay(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function prettyMonth(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}
