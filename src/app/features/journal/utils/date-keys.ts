// Local-time keys for day/week/month. The Jimbo API returns UTC ISO timestamps;
// the journal shows them in the user's local calendar so date arithmetic and
// bucketing all happens in local time and we never call toISOString() on a key.

export type DayKey = string;   // YYYY-MM-DD
export type WeekKey = string;  // YYYY-Www (ISO week)
export type MonthKey = string; // YYYY-MM

const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
const WEEK_KEY_RE = /^\d{4}-W\d{2}$/;
const MONTH_KEY_RE = /^\d{4}-\d{2}$/;

export function isDayKey(value: string | null | undefined): value is DayKey {
  return !!value && DAY_KEY_RE.test(value);
}

export function isWeekKey(value: string | null | undefined): value is WeekKey {
  return !!value && WEEK_KEY_RE.test(value);
}

export function isMonthKey(value: string | null | undefined): value is MonthKey {
  return !!value && MONTH_KEY_RE.test(value);
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

export function todayKey(now: Date = new Date()): DayKey {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function dayKeyFromDate(d: Date): DayKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function dateFromDayKey(key: DayKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function shiftDay(key: DayKey, delta: number): DayKey {
  const d = dateFromDayKey(key);
  d.setDate(d.getDate() + delta);
  return dayKeyFromDate(d);
}

// ISO 8601 week: Monday-anchored, week 1 contains the first Thursday.
// Algorithm follows the standard "Thursday trick".
export function weekKeyFromDate(d: Date): WeekKey {
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dayNum = (target.getDay() + 6) % 7; // Mon=0..Sun=6
  target.setDate(target.getDate() - dayNum + 3); // shift to Thursday
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const firstDayNum = (firstThursday.getDay() + 6) % 7;
  firstThursday.setDate(firstThursday.getDate() - firstDayNum + 3);
  const week = 1 + Math.round((target.getTime() - firstThursday.getTime()) / (7 * 86_400_000));
  return `${target.getFullYear()}-W${pad(week)}`;
}

export function thisWeekKey(now: Date = new Date()): WeekKey {
  return weekKeyFromDate(now);
}

// Returns the Monday that starts the given ISO week.
export function weekStartFromKey(key: WeekKey): Date {
  const [yStr, wStr] = key.split('-W');
  const year = Number(yStr);
  const week = Number(wStr);
  const jan4 = new Date(year, 0, 4);
  const jan4Day = (jan4.getDay() + 6) % 7;
  const mondayOfWeek1 = new Date(year, 0, 4 - jan4Day);
  const monday = new Date(mondayOfWeek1);
  monday.setDate(mondayOfWeek1.getDate() + (week - 1) * 7);
  return monday;
}

export function shiftWeek(key: WeekKey, delta: number): WeekKey {
  const monday = weekStartFromKey(key);
  monday.setDate(monday.getDate() + delta * 7);
  return weekKeyFromDate(monday);
}

export function daysInWeek(key: WeekKey): DayKey[] {
  const monday = weekStartFromKey(key);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return dayKeyFromDate(d);
  });
}

export function thisMonthKey(now: Date = new Date()): MonthKey {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
}

export function monthKeyFromDate(d: Date): MonthKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function monthRange(key: MonthKey): { start: Date; end: Date } {
  const [y, m] = key.split('-').map(Number);
  return { start: new Date(y, m - 1, 1), end: new Date(y, m, 0) };
}

export function shiftMonth(key: MonthKey, delta: number): MonthKey {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return monthKeyFromDate(d);
}

export function daysInMonth(key: MonthKey): DayKey[] {
  const { end } = monthRange(key);
  const [y, m] = key.split('-').map(Number);
  return Array.from({ length: end.getDate() }, (_, i) => `${y}-${pad(m)}-${pad(i + 1)}`);
}

export function dayKeyOf(iso: string | null | undefined): DayKey | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return dayKeyFromDate(d);
}

const LONG_DATE: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
const SHORT_DATE: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' };

export function formatDayLong(key: DayKey): string {
  return dateFromDayKey(key).toLocaleDateString(undefined, LONG_DATE);
}

export function formatDayShort(key: DayKey): string {
  return dateFromDayKey(key).toLocaleDateString(undefined, SHORT_DATE);
}

export function formatWeekRange(key: WeekKey): string {
  const monday = weekStartFromKey(key);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const sameMonth = monday.getMonth() === sunday.getMonth();
  const a = monday.toLocaleDateString(undefined, sameMonth ? { day: 'numeric' } : { day: 'numeric', month: 'short' });
  const b = sunday.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  return `${a} – ${b}`;
}

export function formatMonthLong(key: MonthKey): string {
  const { start } = monthRange(key);
  return start.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}
