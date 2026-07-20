// Builds the day's retrospective timeline from the signals verified live in
// prod (Jul 2026): calendar events (intent), focus + code sessions (desk
// evidence), YouTube watch segments (consumption), exercise sessions (body),
// and commit pins. Pure functions over the already-fetched feeds — the
// timeline section component is a thin positioned-div renderer over this.
//
// Deliberately excluded: usage/screen_session (rolling overlapping 2-hour
// snapshots, not intervals — they'd render as garbage), media.session_started
// (no paired duration), sleep (nothing records it).

import type {
  CalendarEventLite,
  FocusSessionLite,
  TelemetryEventLite,
} from '../data-access/journal-data.service';
import type { CodeSession } from '../data-access/code-sessions.service';

export type RetroLane = 'plan' | 'desk' | 'watching' | 'body';
export type RetroSource = 'calendar' | 'focus' | 'code' | 'youtube' | 'exercise';

export interface RetroInterval {
  readonly id: string;
  readonly lane: RetroLane;
  readonly source: RetroSource;
  readonly startMs: number;
  readonly endMs: number;
  readonly label: string;
  readonly detail: string | null;
}

export interface RetroPinCluster {
  readonly id: string;
  readonly tsMs: number;
  readonly count: number;
  readonly label: string;
  /** Individual commit subjects, newest last — feeds the hover tooltip. */
  readonly items: readonly string[];
}

const MIN_MS = 60_000;

// Segments closer than this merge into one watch episode. YouTube emits
// ~60s heartbeat segments; a pause shorter than an ad break shouldn't split
// the block, a real walk-away should.
const YOUTUBE_GAP_MS = 10 * MIN_MS;

// Commits landing within this window collapse into one pin — a rebase or a
// burst of small commits is one moment of "shipped", not five dots.
const PIN_CLUSTER_MS = 15 * MIN_MS;

export function calendarIntervals(events: readonly CalendarEventLite[]): RetroInterval[] {
  return events
    .filter(e => !e.all_day && e.start && e.end)
    .map(e => ({
      id: `cal-${e.id}`,
      lane: 'plan' as const,
      source: 'calendar' as const,
      startMs: Date.parse(e.start),
      endMs: Math.max(Date.parse(e.end), Date.parse(e.start) + 15 * MIN_MS),
      label: e.summary,
      detail: e.calendar ?? null,
    }))
    .filter(e => Number.isFinite(e.startMs) && Number.isFinite(e.endMs));
}

export function focusIntervals(
  sessions: readonly FocusSessionLite[],
  projectNameOf: (id: string | null) => string,
): RetroInterval[] {
  return sessions.map(s => {
    const startMs = Date.parse(s.started_at);
    const seconds = s.actual_seconds ?? s.planned_seconds;
    return {
      id: `focus-${s.id}`,
      lane: 'desk' as const,
      source: 'focus' as const,
      startMs,
      endMs: startMs + Math.max(seconds, 5 * 60) * 1000,
      label: projectNameOf(s.project_id),
      detail: s.notes,
    };
  });
}

export function codeIntervals(sessions: readonly CodeSession[], nowMs: number): RetroInterval[] {
  return sessions.map(s => {
    const startMs = Date.parse(s.started_at);
    const endMs = s.ended_at
      ? Date.parse(s.ended_at)
      : s.duration_minutes != null
        ? startMs + s.duration_minutes * MIN_MS
        : Math.max(nowMs, startMs + 5 * MIN_MS);
    return {
      id: `code-${s.id}`,
      lane: 'desk' as const,
      source: 'code' as const,
      startMs,
      endMs,
      label: s.headline ?? (s.repo?.split('/').at(-1) ?? 'Code session'),
      detail: s.repo,
    };
  });
}

export function exerciseIntervals(events: readonly TelemetryEventLite[]): RetroInterval[] {
  return events
    .filter(e => e.collector === 'health_connect' && e.type === 'exercise_session')
    .map(e => {
      const startMs = Date.parse(e.ts);
      return {
        id: `ex-${e.id}`,
        lane: 'body' as const,
        source: 'exercise' as const,
        startMs,
        endMs: startMs + Math.max(e.value ?? 0, 5) * MIN_MS,
        label: (e.payload?.['exercise_type'] as string | undefined) ?? 'Exercise',
        detail: null,
      };
    });
}

// Merge per-minute watch segments into contiguous episodes; label each
// episode by its dominant (most-watched) video title.
export function youtubeEpisodes(events: readonly TelemetryEventLite[]): RetroInterval[] {
  const segments = events
    .filter(e => e.collector === 'youtube' && e.type === 'watch_session')
    .map(e => ({
      startMs: Date.parse(e.ts),
      endMs: Date.parse(e.ts) + (e.value ?? 60) * 1000,
      title: (e.payload?.['title'] as string | undefined) ?? null,
      seconds: e.value ?? 60,
    }))
    .filter(s => Number.isFinite(s.startMs))
    .sort((a, b) => a.startMs - b.startMs);

  const episodes: RetroInterval[] = [];
  let current: {
    startMs: number;
    endMs: number;
    byTitle: Map<string, number>;
    titles: Set<string>;
  } | null = null;

  const flush = () => {
    if (!current) return;
    let bestTitle = 'YouTube';
    let bestSeconds = -1;
    for (const [title, secs] of current.byTitle) {
      if (secs > bestSeconds) { bestSeconds = secs; bestTitle = title; }
    }
    const extra = current.titles.size - 1;
    episodes.push({
      id: `yt-${current.startMs}`,
      lane: 'watching',
      source: 'youtube',
      startMs: current.startMs,
      endMs: current.endMs,
      label: bestTitle,
      detail: extra > 0 ? `+${extra} more video${extra === 1 ? '' : 's'}` : null,
    });
    current = null;
  };

  for (const seg of segments) {
    if (current && seg.startMs - current.endMs <= YOUTUBE_GAP_MS) {
      current.endMs = Math.max(current.endMs, seg.endMs);
    } else {
      flush();
      current = { startMs: seg.startMs, endMs: seg.endMs, byTitle: new Map(), titles: new Set() };
    }
    if (seg.title) {
      current.byTitle.set(seg.title, (current.byTitle.get(seg.title) ?? 0) + seg.seconds);
      current.titles.add(seg.title);
    }
  }
  flush();
  return episodes;
}

export function commitPins(events: readonly TelemetryEventLite[]): RetroPinCluster[] {
  type CommitRow = { sha: string; subject: string; author_date: string };
  const commits = events
    .filter(e => e.collector === 'github' && e.type === 'push')
    .flatMap(e => (e.payload?.['commits'] as CommitRow[] | undefined) ?? [])
    .map(c => ({ tsMs: Date.parse(c.author_date), subject: c.subject }))
    .filter(c => Number.isFinite(c.tsMs))
    .sort((a, b) => a.tsMs - b.tsMs);

  const clusters: RetroPinCluster[] = [];
  let current: { tsMs: number; lastMs: number; items: string[] } | null = null;

  const flush = () => {
    if (!current) return;
    clusters.push({
      id: `commits-${current.tsMs}`,
      tsMs: current.tsMs,
      count: current.items.length,
      label: current.items.length === 1 ? current.items[0] : `${current.items.length} commits`,
      items: current.items,
    });
    current = null;
  };

  for (const c of commits) {
    if (current && c.tsMs - current.lastMs <= PIN_CLUSTER_MS) {
      current.items.push(c.subject);
      current.lastMs = c.tsMs;
    } else {
      flush();
      current = { tsMs: c.tsMs, lastMs: c.tsMs, items: [c.subject] };
    }
  }
  flush();
  return clusters;
}

// ── Layout ──────────────────────────────────────────────────────────────────

export interface PositionedInterval extends RetroInterval {
  /** 0-based column within the lane's overlap group. */
  readonly col: number;
  /** Total columns in this interval's overlap group (width divisor). */
  readonly cols: number;
}

// Classic calendar column packing: overlapping intervals in the same lane
// split the lane's width; each connected overlap group divides by its own
// max concurrency, so a lone block still spans the full lane.
export function assignColumns(intervals: readonly RetroInterval[]): PositionedInterval[] {
  const sorted = [...intervals].sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs);
  const out: Array<{ iv: RetroInterval; col: number; group: number }> = [];
  const colEnds: number[] = []; // per active column, the current end
  let group = 0;
  let groupMaxEnd = -Infinity;

  for (const iv of sorted) {
    if (iv.startMs >= groupMaxEnd) {
      group += 1;
      colEnds.length = 0;
    }
    let col = colEnds.findIndex(end => end <= iv.startMs);
    if (col === -1) {
      col = colEnds.length;
      colEnds.push(iv.endMs);
    } else {
      colEnds[col] = iv.endMs;
    }
    groupMaxEnd = Math.max(groupMaxEnd, iv.endMs);
    out.push({ iv, col, group });
  }

  const groupCols = new Map<number, number>();
  for (const o of out) {
    groupCols.set(o.group, Math.max(groupCols.get(o.group) ?? 0, o.col + 1));
  }
  return out.map(o => ({ ...o.iv, col: o.col, cols: groupCols.get(o.group) ?? 1 }));
}

export interface TimelineWindow {
  readonly startMs: number;
  readonly endMs: number;
  readonly hours: readonly number[]; // local hour label per tick, first tick = startMs
}

// Fit the visible window to the data (padded to whole local hours), clamped
// to the local day, with a sensible default span for sparse days.
export function timelineWindow(
  dayStartMs: number,
  intervals: readonly RetroInterval[],
  pins: readonly RetroPinCluster[],
): TimelineWindow {
  const dayEndMs = dayStartMs + 24 * 60 * MIN_MS;
  const HOUR = 60 * MIN_MS;

  let min = Infinity;
  let max = -Infinity;
  for (const iv of intervals) {
    min = Math.min(min, iv.startMs);
    max = Math.max(max, iv.endMs);
  }
  for (const p of pins) {
    min = Math.min(min, p.tsMs);
    max = Math.max(max, p.tsMs);
  }

  // Default working window on an empty day; otherwise pad an hour each side.
  let startMs: number;
  let endMs: number;
  if (!Number.isFinite(min)) {
    startMs = dayStartMs + 8 * HOUR;
    endMs = dayStartMs + 20 * HOUR;
  } else {
    startMs = Math.max(dayStartMs, floorToHour(min, dayStartMs) - HOUR);
    endMs = Math.min(dayEndMs, ceilToHour(max, dayStartMs) + HOUR);
  }

  const hours: number[] = [];
  for (let t = startMs; t <= endMs; t += HOUR) {
    hours.push(Math.round((t - dayStartMs) / HOUR) % 24);
  }
  return { startMs, endMs, hours };
}

function floorToHour(ms: number, dayStartMs: number): number {
  const HOUR = 60 * MIN_MS;
  return dayStartMs + Math.floor((ms - dayStartMs) / HOUR) * HOUR;
}

function ceilToHour(ms: number, dayStartMs: number): number {
  const HOUR = 60 * MIN_MS;
  return dayStartMs + Math.ceil((ms - dayStartMs) / HOUR) * HOUR;
}
