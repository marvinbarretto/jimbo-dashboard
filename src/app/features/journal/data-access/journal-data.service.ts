// Journal bundles: one server round trip per view.
//
// The DAY bundle (GET /api/journal/day) composes focus sessions, calendar,
// telemetry, code sessions and heartbeats; the WORK bundle
// (GET /api/journal/work) carries the work evidence for an arbitrary
// week/month window without the telemetry firehose. Each source fails soft
// to [] server-side. Bucketing stays client-side and local-time so the day a
// session "belongs to" matches the user's calendar — the server is never
// asked to guess a timezone; we send exact [since, until) instants.
//
// Deliberately NOT fetched (verified dead against prod, Jul 2026): the
// activities table (legacy Jimbo agent log, nothing written since the
// April orchestration sunset) and health_connect sleep_session /
// heart_rate_summary (no device records sleep — zero rows ever).

import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type { CodeSession, CodeSessionHeartbeat } from './code-sessions.service';
import {
  type DayKey,
  type MonthKey,
  type WeekKey,
  dateFromDayKey,
  dayKeyOf,
  monthRange,
  shiftDay,
  todayKey,
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
  /** Interval end for windowed collectors (screen_session, HC aggregates). */
  readonly ts_end?: string | null;
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
  readonly code_sessions: readonly CodeSession[];
  readonly heartbeats: readonly CodeSessionHeartbeat[];
  readonly totals: {
    readonly pomos_completed: number;
    readonly pomos_abandoned: number;
    readonly focus_minutes: number;
    readonly events_count: number;
  };
  readonly hourly_minutes: readonly number[]; // length 24
  readonly by_project: readonly ProjectMinutes[];
}

/** Work evidence for a week/month window — pages derive their own rollups. */
export interface WorkBundle {
  readonly granularity: 'week' | 'month';
  readonly key: WeekKey | MonthKey;
  readonly sessions: readonly FocusSessionLite[];
  readonly code_sessions: readonly CodeSession[];
  readonly heartbeats: readonly CodeSessionHeartbeat[];
  readonly github_pushes: readonly TelemetryEventLite[];
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
  /** Taxonomy tag from calendar_config — present on config-enriched reads. */
  calendarTag?: string | null;
}

interface ApiTelemetryEvent {
  id: string;
  collector: string;
  type: string;
  ts: string;
  ts_end: string | null;
  value: number | null;
  unit: string | null;
  source: string | null;
  payload: Record<string, unknown> | null;
}

interface ApiJournalDay {
  focus_sessions: ApiFocusSession[];
  calendar_events: ApiCalendarEvent[];
  telemetry: ApiTelemetryEvent[];
  code_sessions: CodeSession[];
  heartbeats: CodeSessionHeartbeat[];
}

interface ApiJournalWork {
  focus_sessions: ApiFocusSession[];
  code_sessions: CodeSession[];
  heartbeats: CodeSessionHeartbeat[];
  github_pushes: ApiTelemetryEvent[];
}

@Injectable({ providedIn: 'root' })
export class JournalDataService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.dashboardApiUrl;

  // One in-flight bundle per kind. Pages drive the key via an effect.
  readonly day = signal<DayBundle | null>(null);
  readonly work = signal<WorkBundle | null>(null);

  readonly loading = signal<'idle' | 'day' | 'work'>('idle');
  readonly error = signal<string | null>(null);

  // Monotonic per-kind sequence: rapid paging fires overlapping loads, and
  // without a guard whichever request resolved LAST won — not necessarily
  // the period being viewed. Only the newest load may write its bundle.
  private readonly seq = { day: 0, work: 0 };

  private async guardedLoad<T>(
    kind: 'day' | 'work',
    fetch: () => Promise<T>,
    commit: (result: T) => void,
  ): Promise<void> {
    const seq = ++this.seq[kind];
    const isCurrent = () => seq === this.seq[kind];
    this.loading.set(kind);
    this.error.set(null);
    try {
      const result = await fetch();
      if (isCurrent()) commit(result);
    } catch (e) {
      if (isCurrent()) this.error.set(messageOf(e));
    } finally {
      if (isCurrent()) this.loading.set('idle');
    }
  }

  async loadDay(key: DayKey): Promise<void> {
    // Domain pages share the day bundle — switching Overview → Work on the
    // same past day shouldn't refetch. Today always refetches (it's live).
    if (this.day()?.date === key && key !== todayKey()) return;
    return this.guardedLoad('day', async () => {
      const { since, until } = localWindow(dateFromDayKey(key), dateFromDayKey(shiftDay(key, 1)));
      const res = await firstValueFrom(
        this.http.get<ApiJournalDay>(
          `${this.base}/api/journal/day?since=${encodeURIComponent(since)}&until=${encodeURIComponent(until)}`,
        ),
      );
      return buildDayBundle(key, res);
    }, bundle => this.day.set(bundle));
  }

  async loadWork(granularity: 'week' | 'month', key: WeekKey | MonthKey): Promise<void> {
    const current = this.work();
    // Same skip rule as loadDay: a cached past window is immutable; a window
    // containing today stays live and always refetches.
    if (
      current?.granularity === granularity && current.key === key &&
      !windowForPeriod(granularity, key).containsToday
    ) return;
    return this.guardedLoad('work', async () => {
      const { since, until } = windowForPeriod(granularity, key);
      const res = await firstValueFrom(
        this.http.get<ApiJournalWork>(
          `${this.base}/api/journal/work?since=${encodeURIComponent(since)}&until=${encodeURIComponent(until)}`,
        ),
      );
      return {
        granularity,
        key,
        sessions: (res.focus_sessions ?? []).map(toSessionLite),
        code_sessions: res.code_sessions ?? [],
        heartbeats: res.heartbeats ?? [],
        github_pushes: (res.github_pushes ?? []).map(toTelemetryEventLite),
      } satisfies WorkBundle;
    }, bundle => this.work.set(bundle));
  }
}

// Local-midnight [since, until) instants for a week/month key.
function windowForPeriod(
  granularity: 'week' | 'month',
  key: string,
): FetchWindow & { containsToday: boolean } {
  let start: Date;
  let endExclusive: Date;
  if (granularity === 'week') {
    start = weekStartFromKey(key);
    endExclusive = new Date(start);
    endExclusive.setDate(start.getDate() + 7);
  } else {
    const { start: s, end } = monthRange(key);
    start = s;
    endExclusive = new Date(end);
    endExclusive.setDate(end.getDate() + 1);
  }
  const now = Date.now();
  return {
    ...localWindow(start, endExclusive),
    containsToday: now >= start.getTime() && now < endExclusive.getTime(),
  };
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
    ts_end: e.ts_end ?? null,
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
    calendar: e.calendar ?? e.calendarTag ?? undefined,
  };
}

function buildDayBundle(key: DayKey, api: ApiJournalDay): DayBundle {
  const sessions = (api.focus_sessions ?? []).map(toSessionLite);
  const events = (api.calendar_events ?? []).map(toEventLite);
  const telemetry = (api.telemetry ?? []).map(toTelemetryEventLite);
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
    code_sessions: api.code_sessions ?? [],
    heartbeats: api.heartbeats ?? [],
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

interface FetchWindow {
  readonly since: string;
  readonly until: string;
}

function localWindow(start: Date, endExclusive: Date): FetchWindow {
  return { since: start.toISOString(), until: endExclusive.toISOString() };
}

function messageOf(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  return 'Failed to load journal data';
}
