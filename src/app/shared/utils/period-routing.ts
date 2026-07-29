import { type TrackerPeriod } from '@shared/components/ui-period-totals/period-window';
import {
  type DayKey,
  type MonthKey,
  type WeekKey,
  dayKeyFromDate,
  isDayKey,
  isMonthKey,
  isWeekKey,
  monthRange,
  shiftDay,
  shiftMonth,
  shiftWeek,
  thisMonthKey,
  thisWeekKey,
  weekStartFromKey,
} from '@shared/utils/date-keys';
import { logicalToday } from '@shared/utils/datetime.utils';

export function sanitiseKey(
  granularity: TrackerPeriod,
  params: { get(name: string): string | null },
): string {
  if (granularity === 'day') {
    const v = params.get('date');
    return isDayKey(v) ? v : logicalToday();
  }
  if (granularity === 'week') {
    const v = params.get('week');
    return isWeekKey(v) ? v : thisWeekKey();
  }
  const v = params.get('month');
  return isMonthKey(v) ? v : thisMonthKey();
}

export function defaultKey(granularity: TrackerPeriod): string {
  if (granularity === 'day') return logicalToday();
  if (granularity === 'week') return thisWeekKey();
  return thisMonthKey();
}

export function isValidKey(granularity: TrackerPeriod, value: string): boolean {
  if (granularity === 'day') return isDayKey(value);
  if (granularity === 'week') return isWeekKey(value);
  return isMonthKey(value);
}

export function shiftKey(granularity: TrackerPeriod, key: string, delta: number): string {
  if (granularity === 'day') return shiftDay(key as DayKey, delta);
  if (granularity === 'week') return shiftWeek(key as WeekKey, delta);
  return shiftMonth(key as MonthKey, delta);
}

export function anchorIsoOf(granularity: TrackerPeriod, key: string): string {
  if (granularity === 'day') return key;
  if (granularity === 'week') return dayKeyFromDate(weekStartFromKey(key as WeekKey));
  return dayKeyFromDate(monthRange(key as MonthKey).start);
}
