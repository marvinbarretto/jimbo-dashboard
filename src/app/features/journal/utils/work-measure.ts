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

/** Total minutes covered by the union of the given spans. */
export function unionMinutes(spans: readonly SpanMs[]): number {
  const sorted = [...spans]
    .filter(s => s.endMs > s.startMs)
    .sort((a, b) => a.startMs - b.startMs);
  let total = 0;
  let curStart = 0;
  let curEnd = -Infinity;
  for (const s of sorted) {
    if (s.startMs > curEnd) {
      if (curEnd > curStart) total += curEnd - curStart;
      curStart = s.startMs;
      curEnd = s.endMs;
    } else {
      curEnd = Math.max(curEnd, s.endMs);
    }
  }
  if (curEnd > curStart) total += curEnd - curStart;
  return Math.round(total / MIN_MS);
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
