// Day/week/month bundles for the journal feature.
//
// Each bundle is loaded by hitting the same Jimbo endpoints `today-page` uses
// (focus-sessions, activity, calendar) and bucketing on the client. Bucketing
// is local-time so the day a session "belongs to" matches the user's calendar.
// As Jimbo grows new endpoints (mood, exercise, music, …) they slot in here
// without changing the page contracts — pages already render whatever the
// bundle signal exposes.

import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  type DayKey,
  type MonthKey,
  type WeekKey,
  dateFromDayKey,
  daysInMonth,
  daysInWeek,
  dayKeyOf,
  monthRange,
  shiftDay,
  weekStartFromKey,
} from '../utils/date-keys';

export interface FocusSessionLite {
  readonly id: string;
  readonly project_id: string | null;
  readonly started_at: string;
  readonly ended_at: string | null;
  readonly planned_seconds: number;
  readonly actual_seconds: number | null;
  readonly status: 'running' | 'completed' | 'abandoned';
  readonly notes: string | null;
  readonly tags: readonly string[];
}

export interface ActivityLite {
  readonly id: string;
  readonly timestamp: string;
  readonly task_type: string;
  readonly description: string;
  readonly outcome: string | null;
  readonly satisfaction: number | null;
}

export interface CalendarEventLite {
  readonly id: string;
  readonly summary: string;
  readonly start: string;
  readonly end: string;
  readonly all_day: boolean;
  readonly calendar?: string;
}

export interface ProjectMinutes {
  readonly project_id: string | null;
  readonly minutes: number;
  readonly sessions: number;
}

export interface TelemetryEventLite {
  readonly id: string;
  readonly collector: string;
  readonly type: string;
  readonly ts: string;
  readonly value: number | null;
  readonly unit: string | null;
  readonly payload: Record<string, unknown> | null;
}

export interface DayBundle {
  readonly date: DayKey;
  readonly sessions: readonly FocusSessionLite[];
  readonly activities: readonly ActivityLite[];
  readonly events: readonly CalendarEventLite[];
  readonly telemetry: readonly TelemetryEventLite[];
  readonly totals: {
    readonly pomos_completed: number;
    readonly pomos_abandoned: number;
    readonly focus_minutes: number;
    readonly activity_count: number;
    readonly events_count: number;
  };
  readonly hourly_minutes: readonly number[]; // length 24
  readonly by_project: readonly ProjectMinutes[];
  readonly by_task_type: ReadonlyMap<string, number>;
}

export interface WeekBundle {
  readonly week: WeekKey;
  readonly days: readonly DayKey[];
  readonly totals: {
    readonly pomos_completed: number;
    readonly focus_minutes: number;
    readonly activity_count: number;
  };
  readonly minutes_per_day: readonly number[];
  readonly pomos_per_day: readonly number[];
  readonly activities_per_day: readonly number[];
  readonly by_project: readonly ProjectMinutes[];
  readonly by_task_type: ReadonlyMap<string, number>;
}

export interface MonthBundle {
  readonly month: MonthKey;
  readonly days: readonly DayKey[];
  readonly totals: {
    readonly pomos_completed: number;
    readonly focus_minutes: number;
    readonly activity_count: number;
    readonly active_days: number;
  };
  readonly minutes_per_day: readonly number[];
  readonly pomos_per_day: readonly number[];
  readonly by_project: readonly ProjectMinutes[];
}

interface ApiFocusSession {
  id: string;
  project_id: string | null;
  started_at: string;
  ended_at: string | null;
  planned_seconds: number;
  actual_seconds: number | null;
  status: string;
  notes: string | null;
  tags: string[] | null;
}

interface ApiActivity {
  id: string;
  timestamp: string;
  task_type: string;
  description: string;
  outcome: string | null;
  satisfaction: number | null;
}

interface ApiCalendarEvent {
  id: string;
  summary?: string;
  title?: string;
  start: string | { dateTime?: string; date?: string };
  end: string | { dateTime?: string; date?: string };
  all_day?: boolean;
  calendar?: string;
}

interface ApiTelemetryEvent {
  id: string;
  collector: string;
  type: string;
  ts: string;
  value: number | null;
  unit: string | null;
  payload: Record<string, unknown> | null;
}

@Injectable({ providedIn: 'root' })
export class JournalDataService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.dashboardApiUrl;

  // One in-flight bundle per granularity. Pages drive the key via an effect.
  readonly day = signal<DayBundle | null>(null);
  readonly week = signal<WeekBundle | null>(null);
  readonly month = signal<MonthBundle | null>(null);

  readonly loading = signal<'idle' | 'day' | 'week' | 'month'>('idle');
  readonly error = signal<string | null>(null);

  async loadDay(key: DayKey): Promise<void> {
    this.loading.set('day');
    this.error.set(null);
    try {
      const daysBack = daysBackFromAnchor(dateFromDayKey(key), 1);
      const [sessions, activities, events, telemetry] = await Promise.all([
        this.fetchSessions({ daysBack }),
        this.fetchActivitiesForDate(key),
        this.fetchEvents({ days: daysBack }),
        this.fetchTelemetryForDate(key),
      ]);
      this.day.set(buildDayBundle(key, sessions, activities, events, telemetry));
    } catch (e) {
      this.error.set(messageOf(e));
    } finally {
      this.loading.set('idle');
    }
  }

  async loadWeek(key: WeekKey): Promise<void> {
    this.loading.set('week');
    this.error.set(null);
    try {
      const monday = weekStartFromKey(key);
      const daysBack = daysBackFromAnchor(monday, 7);
      const [sessions, activities] = await Promise.all([
        this.fetchSessions({ daysBack }),
        this.fetchActivities({ days: daysBack }),
      ]);
      this.week.set(buildWeekBundle(key, sessions, activities));
    } catch (e) {
      this.error.set(messageOf(e));
    } finally {
      this.loading.set('idle');
    }
  }

  async loadMonth(key: MonthKey): Promise<void> {
    this.loading.set('month');
    this.error.set(null);
    try {
      const { start, end } = monthRange(key);
      const daysSpan = end.getDate();
      const daysBack = daysBackFromAnchor(start, daysSpan);
      const [sessions, activities] = await Promise.all([
        this.fetchSessions({ daysBack }),
        this.fetchActivities({ days: daysBack }),
      ]);
      this.month.set(buildMonthBundle(key, sessions, activities));
    } catch (e) {
      this.error.set(messageOf(e));
    } finally {
      this.loading.set('idle');
    }
  }

  private async fetchSessions(opts: { daysBack: number }): Promise<FocusSessionLite[]> {
    try {
      const res = await firstValueFrom(
        this.http.get<{ items: ApiFocusSession[] }>(
          `${this.base}/api/focus-sessions?days=${Math.max(1, opts.daysBack)}`,
        ),
      );
      return (res.items ?? []).map(toSessionLite);
    } catch {
      return [];
    }
  }

  private async fetchActivitiesForDate(date: DayKey): Promise<ActivityLite[]> {
    try {
      const res = await firstValueFrom(
        this.http.get<{ entries: ApiActivity[] }>(`${this.base}/api/activity?date=${date}`),
      );
      return (res.entries ?? []).map(toActivityLite);
    } catch {
      return [];
    }
  }

  private async fetchActivities(opts: { days: number }): Promise<ActivityLite[]> {
    try {
      const res = await firstValueFrom(
        this.http.get<{ entries: ApiActivity[] }>(
          `${this.base}/api/activity?days=${Math.max(1, opts.days)}`,
        ),
      );
      return (res.entries ?? []).map(toActivityLite);
    } catch {
      return [];
    }
  }

  private async fetchEvents(opts: { days: number }): Promise<CalendarEventLite[]> {
    try {
      const res = await firstValueFrom(
        this.http.get<{ items?: ApiCalendarEvent[]; events?: ApiCalendarEvent[] }>(
          `${this.base}/api/google-calendar/events?days=${opts.days}`,
        ),
      );
      const raw = res.items ?? res.events ?? [];
      return raw.map(toEventLite);
    } catch {
      return [];
    }
  }

  private async fetchTelemetryForDate(date: DayKey): Promise<TelemetryEventLite[]> {
    try {
      // Use local-time midnight boundaries so screen_session events (whose ts is
      // a UTC Instant from the device) correctly align with the user's calendar day.
      const dayStart = dateFromDayKey(date);
      const dayEnd = dateFromDayKey(shiftDay(date, 1));
      const since = dayStart.toISOString();
      const until = dayEnd.toISOString();

      // app_usage_daily has ts = previous local-day midnight (start of the covered
      // period). For a UTC+N user that timestamp is N hours before local midnight,
      // falling outside the main window. Fetch it separately from the prior day.
      const prevSince = dateFromDayKey(shiftDay(date, -1)).toISOString();

      // Sleep sessions start the night before (e.g. 23:00 local), so their ts
      // falls before local midnight. Fetch health_connect from the prior evening.
      const eveningSince = dateFromDayKey(shiftDay(date, -1)).toISOString();

      const [dayRes, usageRes, sleepRes] = await Promise.all([
        firstValueFrom(
          this.http.get<{ events: ApiTelemetryEvent[] }>(
            `${this.base}/api/telemetry/events?since=${encodeURIComponent(since)}&until=${encodeURIComponent(until)}&limit=500`,
          ),
        ),
        firstValueFrom(
          this.http.get<{ events: ApiTelemetryEvent[] }>(
            `${this.base}/api/telemetry/events?collector=usage&type=app_usage_daily&since=${encodeURIComponent(prevSince)}&until=${encodeURIComponent(since)}&limit=5`,
          ),
        ),
        firstValueFrom(
          this.http.get<{ events: ApiTelemetryEvent[] }>(
            `${this.base}/api/telemetry/events?collector=health_connect&type=sleep_session&since=${encodeURIComponent(eveningSince)}&until=${encodeURIComponent(since)}&limit=10`,
          ),
        ),
      ]);

      const dayEvents = (dayRes.events ?? []).map(toTelemetryEventLite);
      const extraEvents = [
        ...(usageRes.events ?? []).map(toTelemetryEventLite),
        ...(sleepRes.events ?? []).map(toTelemetryEventLite),
      ];
      const dayIds = new Set(dayEvents.map(e => e.id));
      return [...dayEvents, ...extraEvents.filter(e => !dayIds.has(e.id))];
    } catch {
      return [];
    }
  }
}

function toSessionLite(s: ApiFocusSession): FocusSessionLite {
  const status = s.status === 'completed' || s.status === 'abandoned' ? s.status : 'running';
  return {
    id: s.id,
    project_id: s.project_id,
    started_at: s.started_at,
    ended_at: s.ended_at,
    planned_seconds: s.planned_seconds,
    actual_seconds: s.actual_seconds,
    status,
    notes: s.notes,
    tags: s.tags ?? [],
  };
}

function toActivityLite(a: ApiActivity): ActivityLite {
  return {
    id: a.id,
    timestamp: a.timestamp,
    task_type: a.task_type,
    description: a.description,
    outcome: a.outcome,
    satisfaction: a.satisfaction,
  };
}

function toTelemetryEventLite(e: ApiTelemetryEvent): TelemetryEventLite {
  return {
    id: e.id,
    collector: e.collector,
    type: e.type,
    ts: e.ts,
    value: e.value,
    unit: e.unit,
    payload: e.payload,
  };
}

function toEventLite(e: ApiCalendarEvent): CalendarEventLite {
  const start = typeof e.start === 'string' ? e.start : (e.start.dateTime ?? e.start.date ?? '');
  const end = typeof e.end === 'string' ? e.end : (e.end.dateTime ?? e.end.date ?? '');
  const allDay = e.all_day ?? (typeof e.start === 'object' && !!e.start.date);
  return {
    id: e.id,
    summary: e.summary ?? e.title ?? '(untitled event)',
    start,
    end,
    all_day: allDay,
    calendar: e.calendar,
  };
}

function buildDayBundle(
  key: DayKey,
  sessions: readonly FocusSessionLite[],
  activities: readonly ActivityLite[],
  events: readonly CalendarEventLite[],
  telemetry: readonly TelemetryEventLite[],
): DayBundle {
  const daySessions = sessions.filter(s => dayKeyOf(s.started_at) === key);
  const dayEvents = events.filter(e => dayKeyOf(e.start) === key);

  const hourly = new Array<number>(24).fill(0);
  let pomosCompleted = 0;
  let pomosAbandoned = 0;
  let focusSeconds = 0;

  for (const s of daySessions) {
    if (s.status === 'completed') pomosCompleted += 1;
    else if (s.status === 'abandoned') pomosAbandoned += 1;
    const seconds = sessionEffectiveSeconds(s);
    focusSeconds += seconds;
    const startHour = new Date(s.started_at).getHours();
    hourly[startHour] = (hourly[startHour] ?? 0) + seconds / 60;
  }

  const byTask = new Map<string, number>();
  for (const a of activities) {
    byTask.set(a.task_type, (byTask.get(a.task_type) ?? 0) + 1);
  }

  return {
    date: key,
    sessions: daySessions,
    activities,
    events: dayEvents,
    telemetry,
    totals: {
      pomos_completed: pomosCompleted,
      pomos_abandoned: pomosAbandoned,
      focus_minutes: Math.round(focusSeconds / 60),
      activity_count: activities.length,
      events_count: dayEvents.length,
    },
    hourly_minutes: hourly.map(m => Math.round(m)),
    by_project: aggregateByProject(daySessions),
    by_task_type: byTask,
  };
}

function buildWeekBundle(
  key: WeekKey,
  sessions: readonly FocusSessionLite[],
  activities: readonly ActivityLite[],
): WeekBundle {
  const days = daysInWeek(key);
  const dayIndex = new Map(days.map((d, i) => [d, i] as const));
  const minutesPerDay = new Array<number>(7).fill(0);
  const pomosPerDay = new Array<number>(7).fill(0);
  const activitiesPerDay = new Array<number>(7).fill(0);
  const inWeekSessions: FocusSessionLite[] = [];

  for (const s of sessions) {
    const day = dayKeyOf(s.started_at);
    if (!day) continue;
    const idx = dayIndex.get(day);
    if (idx === undefined) continue;
    inWeekSessions.push(s);
    minutesPerDay[idx] += sessionEffectiveSeconds(s) / 60;
    if (s.status === 'completed') pomosPerDay[idx] += 1;
  }

  let activityCount = 0;
  const byTask = new Map<string, number>();
  for (const a of activities) {
    const day = dayKeyOf(a.timestamp);
    if (!day) continue;
    const idx = dayIndex.get(day);
    if (idx === undefined) continue;
    activitiesPerDay[idx] += 1;
    activityCount += 1;
    byTask.set(a.task_type, (byTask.get(a.task_type) ?? 0) + 1);
  }

  return {
    week: key,
    days,
    totals: {
      pomos_completed: pomosPerDay.reduce((a, b) => a + b, 0),
      focus_minutes: Math.round(minutesPerDay.reduce((a, b) => a + b, 0)),
      activity_count: activityCount,
    },
    minutes_per_day: minutesPerDay.map(m => Math.round(m)),
    pomos_per_day: pomosPerDay,
    activities_per_day: activitiesPerDay,
    by_project: aggregateByProject(inWeekSessions),
    by_task_type: byTask,
  };
}

function buildMonthBundle(
  key: MonthKey,
  sessions: readonly FocusSessionLite[],
  activities: readonly ActivityLite[],
): MonthBundle {
  const days = daysInMonth(key);
  const dayIndex = new Map(days.map((d, i) => [d, i] as const));
  const minutesPerDay = new Array<number>(days.length).fill(0);
  const pomosPerDay = new Array<number>(days.length).fill(0);
  const inMonthSessions: FocusSessionLite[] = [];
  const activeDays = new Set<DayKey>();

  for (const s of sessions) {
    const day = dayKeyOf(s.started_at);
    if (!day) continue;
    const idx = dayIndex.get(day);
    if (idx === undefined) continue;
    inMonthSessions.push(s);
    minutesPerDay[idx] += sessionEffectiveSeconds(s) / 60;
    if (s.status === 'completed') pomosPerDay[idx] += 1;
    if ((s.actual_seconds ?? 0) > 0 || s.status === 'completed') activeDays.add(day);
  }

  let activityCount = 0;
  for (const a of activities) {
    const day = dayKeyOf(a.timestamp);
    if (!day) continue;
    if (!dayIndex.has(day)) continue;
    activityCount += 1;
    activeDays.add(day);
  }

  return {
    month: key,
    days,
    totals: {
      pomos_completed: pomosPerDay.reduce((a, b) => a + b, 0),
      focus_minutes: Math.round(minutesPerDay.reduce((a, b) => a + b, 0)),
      activity_count: activityCount,
      active_days: activeDays.size,
    },
    minutes_per_day: minutesPerDay.map(m => Math.round(m)),
    pomos_per_day: pomosPerDay,
    by_project: aggregateByProject(inMonthSessions),
  };
}

function aggregateByProject(sessions: readonly FocusSessionLite[]): ProjectMinutes[] {
  const buckets = new Map<string, { minutes: number; sessions: number }>();
  for (const s of sessions) {
    const key = s.project_id ?? '';
    const bucket = buckets.get(key) ?? { minutes: 0, sessions: 0 };
    bucket.minutes += sessionEffectiveSeconds(s) / 60;
    bucket.sessions += 1;
    buckets.set(key, bucket);
  }
  return [...buckets.entries()]
    .map(([id, b]) => ({
      project_id: id || null,
      minutes: Math.round(b.minutes),
      sessions: b.sessions,
    }))
    .sort((a, b) => b.minutes - a.minutes);
}

// actual_seconds is the truth when the session has ended; otherwise fall back
// to planned_seconds so a still-running pomodoro doesn't read as 0 minutes.
function sessionEffectiveSeconds(s: FocusSessionLite): number {
  if (s.status === 'completed' && s.actual_seconds != null) return s.actual_seconds;
  if (s.status === 'abandoned' && s.actual_seconds != null) return s.actual_seconds;
  return s.actual_seconds ?? s.planned_seconds;
}

// `days` param on the API is "days back from now". Translate the bundle's
// anchor (start of week / start of month) into how far back we need to look.
function daysBackFromAnchor(anchor: Date, span: number): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const a = new Date(anchor);
  a.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - a.getTime()) / 86_400_000);
  return Math.max(span, diffDays + span);
}

function messageOf(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  return 'Failed to load journal data';
}
