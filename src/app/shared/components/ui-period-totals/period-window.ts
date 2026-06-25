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
 * spills into the next month. `elapsedDays` counts from the window start to the
 * anchor inclusive, so averages reflect days lived, not the full span.
 *
 * Pure (no clock) and exported for unit tests of the boundary maths.
 */
export function periodWindow(period: TrackerPeriod, anchor: string): PeriodWindow {
  if (period === 'day') {
    return { start: anchor, end: anchor, elapsedDays: 1, label: prettyDay(anchor) };
  }
  if (period === 'week') {
    const dow = new Date(`${anchor}T00:00:00Z`).getUTCDay(); // 0=Sun
    const backToMon = (dow + 6) % 7;
    const start = shiftIsoDay(anchor, -backToMon);
    const end = shiftIsoDay(start, 6);
    return { start, end, elapsedDays: backToMon + 1, label: `${prettyDay(start)} – ${prettyDay(end)}` };
  }
  const year = Number(anchor.slice(0, 4));
  const month = Number(anchor.slice(5, 7)); // 1-based
  const dayOfMonth = Number(anchor.slice(8, 10));
  const start = `${anchor.slice(0, 7)}-01`;
  // Day 0 of the next month is the last day of this one.
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const end = `${anchor.slice(0, 7)}-${String(lastDay).padStart(2, '0')}`;
  return { start, end, elapsedDays: dayOfMonth, label: prettyMonth(anchor) };
}

function prettyDay(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function prettyMonth(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}
