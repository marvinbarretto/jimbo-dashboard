// Day/week/month bundles for the journal feature.
//
// Each bundle is loaded by hitting the same Jimbo endpoints `today-page` uses
// (focus-sessions, calendar, telemetry) and bucketing on the client. Bucketing
// is local-time so the day a session "belongs to" matches the user's calendar.
// As Jimbo grows new endpoints (mood, exercise, music, …) they slot in here
// without changing the page contracts — pages already render whatever the
// bundle signal exposes.
//
// Deliberately NOT fetched (verified dead against prod, Jul 2026): the
// activities table (legacy Jimbo agent log, nothing written since the
// April orchestration sunset) and health_connect sleep_session /
// heart_rate_summary (no device records sleep — zero rows ever).

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
} from '@shared/utils/date-keys';

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
  readonly source: string | null;
  readonly payload: Record<string, unknown> | null;
}

export interface DayBundle {
  readonly date: DayKey;
  readonly sessions: readonly FocusSessionLite[];
  readonly events: readonly CalendarEventLite[];
  readonly telemetry: readonly TelemetryEventLite[];
  readonly totals: {
    readonly pomos_completed: number;
    readonly pomos_abandoned: number;
    readonly focus_minutes: number;
    readonly events_count: number;
  };
  readonly hourly_minutes: readonly number[]; // length 24
  readonly by_project: readonly ProjectMinutes[];
}

export interface WeekBundle {
  readonly week: WeekKey;
  readonly days: readonly DayKey[];
  readonly totals: {
    readonly pomos_completed: number;
    readonly focus_minutes: number;
  };
  readonly minutes_per_day: readonly number[];
  readonly pomos_per_day: readonly number[];
  readonly by_project: readonly ProjectMinutes[];
}

export interface MonthBundle {
  readonly month: MonthKey;
  readonly days: readonly DayKey[];
  readonly totals: {
    readonly pomos_completed: number;
    readonly focus_minutes: number;
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
  source: string | null;
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
      const [sessions, events, telemetry] = await Promise.all([
        this.fetchSessions({ daysBack }),
        this.fetchEvents({ days: daysBack }),
        this.fetchTelemetryForDate(key),
      ]);
      this.day.set(buildDayBundle(key, sessions, events, telemetry));
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
      const sessions = await this.fetchSessions({ daysBack });
      this.week.set(buildWeekBundle(key, sessions));
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
      const sessions = await this.fetchSessions({ daysBack });
      this.month.set(buildMonthBundle(key, sessions));
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

      const [dayRes, usageRes, githubRes, youtubeRes] = await Promise.all([
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
        // Pulled separately because high-volume collectors (notifications,
        // location) drown github pushes out of the 500-event main window
        // on busy days.
        firstValueFrom(
          this.http.get<{ events: ApiTelemetryEvent[] }>(
            `${this.base}/api/telemetry/events?collector=github&type=push&since=${encodeURIComponent(since)}&until=${encodeURIComponent(until)}&limit=100`,
          ),
        ),
        // YouTube watch segments — pulled separately for the same reason as github:
        // a heavy-viewing day can exceed the 500-event main window. Many short
        // segments per day, so the limit is generous.
        firstValueFrom(
          this.http.get<{ events: ApiTelemetryEvent[] }>(
            `${this.base}/api/telemetry/events?collector=youtube&type=watch_session&since=${encodeURIComponent(since)}&until=${encodeURIComponent(until)}&limit=500`,
          ),
        ),
      ]);

      const dayEvents = (dayRes.events ?? []).map(toTelemetryEventLite);
      const extraEvents = [
        ...(usageRes.events ?? []).map(toTelemetryEventLite),
        ...(githubRes.events ?? []).map(toTelemetryEventLite),
        ...(youtubeRes.events ?? []).map(toTelemetryEventLite),
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

function toTelemetryEventLite(e: ApiTelemetryEvent): TelemetryEventLite {
  return {
    id: e.id,
    collector: e.collector,
    type: e.type,
    ts: e.ts,
    value: e.value,
    unit: e.unit,
    source: e.source ?? null,
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

  return {
    date: key,
    sessions: daySessions,
    events: dayEvents,
    telemetry,
    totals: {
      pomos_completed: pomosCompleted,
      pomos_abandoned: pomosAbandoned,
      focus_minutes: Math.round(focusSeconds / 60),
      events_count: dayEvents.length,
    },
    hourly_minutes: hourly.map(m => Math.round(m)),
    by_project: aggregateByProject(daySessions),
  };
}

function buildWeekBundle(
  key: WeekKey,
  sessions: readonly FocusSessionLite[],
): WeekBundle {
  const days = daysInWeek(key);
  const dayIndex = new Map(days.map((d, i) => [d, i] as const));
  const minutesPerDay = new Array<number>(7).fill(0);
  const pomosPerDay = new Array<number>(7).fill(0);
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

  return {
    week: key,
    days,
    totals: {
      pomos_completed: pomosPerDay.reduce((a, b) => a + b, 0),
      focus_minutes: Math.round(minutesPerDay.reduce((a, b) => a + b, 0)),
    },
    minutes_per_day: minutesPerDay.map(m => Math.round(m)),
    pomos_per_day: pomosPerDay,
    by_project: aggregateByProject(inWeekSessions),
  };
}

function buildMonthBundle(
  key: MonthKey,
  sessions: readonly FocusSessionLite[],
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

  return {
    month: key,
    days,
    totals: {
      pomos_completed: pomosPerDay.reduce((a, b) => a + b, 0),
      focus_minutes: Math.round(minutesPerDay.reduce((a, b) => a + b, 0)),
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
