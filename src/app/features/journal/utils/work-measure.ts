// "Work" measured from evidence, not just pomodoros. Marvin multitasks — a
// day can hold 6 pomos, 3 code sessions and 12 commits, and counting only
// the pomos reads as a 2.5h day. Desk time here is the UNION of focus
// sessions and honest code-session intervals, so overlapping evidence (a
// pomo run inside a code session) counts once.

import type { CodeSession } from '../data-access/code-sessions.service';
import type { FocusSessionLite } from '../data-access/journal-data.service';
import type { BurstSegment } from './retro-timeline';

export interface SpanMs {
  readonly startMs: number;
  readonly endMs: number;
}

// Envelopes longer than this are terminal-left-open time, not one work
// stretch (same threshold as the timeline's hollow rendering).
const HONEST_ENVELOPE_MS = 3 * 3_600_000;
const MIN_MS = 60_000;

/** Overlapping spans merged into a sorted, disjoint cover. */
export function mergeSpans(spans: readonly SpanMs[]): SpanMs[] {
  const sorted = [...spans]
    .filter(s => s.endMs > s.startMs)
    .sort((a, b) => a.startMs - b.startMs);
  const merged: Array<{ startMs: number; endMs: number }> = [];
  for (const s of sorted) {
    const last = merged[merged.length - 1];
    if (last && s.startMs <= last.endMs) last.endMs = Math.max(last.endMs, s.endMs);
    else merged.push({ startMs: s.startMs, endMs: s.endMs });
  }
  return merged;
}

/** Total minutes covered by the union of the given spans. */
export function unionMinutes(spans: readonly SpanMs[]): number {
  const total = mergeSpans(spans).reduce((t, s) => t + (s.endMs - s.startMs), 0);
  return Math.round(total / MIN_MS);
}

const HOUR_MS = 3_600_000;

/**
 * Union minutes bucketed into the day's 24 local hours — a span crossing an
 * hour boundary contributes to both buckets pro-rata, so the bars sum to the
 * desk-time total instead of lumping a whole session on its start hour.
 */
export function hourlyUnionMinutes(spans: readonly SpanMs[], dayStartMs: number): number[] {
  const buckets = new Array<number>(24).fill(0);
  for (const s of mergeSpans(spans)) {
    const firstHour = Math.max(0, Math.floor((s.startMs - dayStartMs) / HOUR_MS));
    const lastHour = Math.min(23, Math.floor((s.endMs - 1 - dayStartMs) / HOUR_MS));
    for (let h = firstHour; h <= lastHour; h++) {
      const hourStart = dayStartMs + h * HOUR_MS;
      const overlap = Math.min(s.endMs, hourStart + HOUR_MS) - Math.max(s.startMs, hourStart);
      if (overlap > 0) buckets[h] += overlap / MIN_MS;
    }
  }
  return buckets.map(m => Math.round(m));
}

export interface ProjectWorkMinutes {
  readonly project_id: string | null;
  readonly minutes: number;
}

/**
 * Per-project desk minutes from ALL evidence: each project's focus spans and
 * honest code spans are unioned together, so a pomo run inside a code session
 * on the same project counts once. Pass interactive code sessions only —
 * executor time is the fleet's, not the desk's.
 */
export function projectUnionMinutes(
  focus: readonly FocusSessionLite[],
  code: readonly CodeSession[],
  bursts: ReadonlyMap<string, readonly BurstSegment[]>,
): ProjectWorkMinutes[] {
  const byProject = new Map<string, SpanMs[]>();
  const add = (projectId: string | null, spans: readonly SpanMs[]) => {
    if (!spans.length) return;
    const key = projectId ?? '';
    byProject.set(key, [...(byProject.get(key) ?? []), ...spans]);
  };
  for (const s of focus) add(s.project_id, focusSpans([s]));
  for (const s of code) add(s.project_id, codeEvidenceSpans([s], bursts));
  return [...byProject.entries()]
    .map(([key, spans]) => ({ project_id: key || null, minutes: unionMinutes(spans) }))
    .filter(p => p.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes);
}

export function focusSpans(sessions: readonly FocusSessionLite[]): SpanMs[] {
  return sessions.map(s => {
    const startMs = Date.parse(s.started_at);
    return { startMs, endMs: startMs + (s.actual_seconds ?? s.planned_seconds) * 1000 };
  });
}

// A code session contributes:
//  - its full span when that span is believably one stretch of work
//    (completed or short-running, under the honest-envelope cap), else
//  - its heartbeat bursts, when a trail exists, else
//  - nothing (a long envelope with no trail is just an open terminal).
export function codeEvidenceSpans(
  sessions: readonly CodeSession[],
  bursts: ReadonlyMap<string, readonly BurstSegment[]>,
): SpanMs[] {
  const spans: SpanMs[] = [];
  for (const s of sessions) {
    const startMs = Date.parse(s.started_at);
    const endMs = s.ended_at
      ? Date.parse(s.ended_at)
      : s.last_seen_at
        ? Date.parse(s.last_seen_at)
        : s.duration_minutes != null
          ? startMs + s.duration_minutes * MIN_MS
          : startMs;
    const trail = bursts.get(s.session_id) ?? [];
    if (trail.length) {
      spans.push(...trail.map(b => ({ startMs: b.startMs, endMs: b.endMs })));
    } else if (endMs - startMs <= HONEST_ENVELOPE_MS) {
      spans.push({ startMs, endMs });
    }
  }
  return spans;
}
