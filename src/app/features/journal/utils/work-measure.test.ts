import { describe, expect, it } from 'vitest';
import type { CodeSession } from '../data-access/code-sessions.service';
import type { FocusSessionLite } from '../data-access/journal-data.service';
import type { BurstSegment } from './retro-timeline';
import {
  codeEvidenceSpans,
  hourlyUnionMinutes,
  projectUnionMinutes,
  unionMinutes,
} from './work-measure';

const T0 = Date.parse('2026-07-20T10:00:00Z');
const MIN = 60_000;

function span(startMin: number, endMin: number) {
  return { startMs: T0 + startMin * MIN, endMs: T0 + endMin * MIN };
}

function session(over: Partial<CodeSession>): CodeSession {
  return {
    id: over.id ?? 'x',
    session_id: over.session_id ?? 'sess-x',
    source: 'claude_code',
    status: 'completed',
    started_at: new Date(T0).toISOString(),
    ended_at: null,
    duration_minutes: null,
    cwd: '/x',
    repo: null,
    branch: null,
    actor: null,
    project_id: null,
    headline: null,
    bullets: [],
    narrative: null,
    next_steps: [],
    topics: [],
    artifacts: { commits: [], files_touched: 0, top_files: [], prs: [], tests_run: null, tests_passed: null },
    friction: null,
    outcome: null,
    last_seen_at: null,
    ...over,
  };
}

describe('unionMinutes', () => {
  it('sums disjoint spans', () => {
    expect(unionMinutes([span(0, 25), span(60, 85)])).toBe(50);
  });

  it('counts overlapping evidence once — pomo inside a code session', () => {
    expect(unionMinutes([span(0, 120), span(30, 55)])).toBe(120);
  });

  it('merges chains of partial overlaps', () => {
    expect(unionMinutes([span(0, 40), span(30, 70), span(60, 100)])).toBe(100);
  });

  it('handles empty and inverted spans', () => {
    expect(unionMinutes([])).toBe(0);
    expect(unionMinutes([span(10, 10)])).toBe(0);
  });
});

function focus(over: Partial<FocusSessionLite>): FocusSessionLite {
  return {
    id: over.id ?? 'f-x',
    project_id: null,
    started_at: new Date(T0).toISOString(),
    ended_at: null,
    planned_seconds: 1500,
    actual_seconds: 1500,
    status: 'completed',
    notes: null,
    tags: [],
    ...over,
  };
}

describe('hourlyUnionMinutes', () => {
  // T0 is 10:00Z; use it as the "day start" so bucket 0 = the T0 hour.
  it('splits a span crossing an hour boundary pro-rata', () => {
    const buckets = hourlyUnionMinutes([span(30, 90)], T0);
    expect(buckets[0]).toBe(30);
    expect(buckets[1]).toBe(30);
    expect(buckets.reduce((a, b) => a + b, 0)).toBe(60);
  });

  it('counts overlapping spans once, matching the desk-time total', () => {
    const spans = [span(0, 120), span(30, 55)];
    const buckets = hourlyUnionMinutes(spans, T0);
    expect(buckets.reduce((a, b) => a + b, 0)).toBe(unionMinutes(spans));
  });

  it('clamps spans outside the day', () => {
    const buckets = hourlyUnionMinutes([span(-60, 30), span(23 * 60 + 30, 25 * 60)], T0);
    expect(buckets[0]).toBe(30);
    expect(buckets[23]).toBe(30);
  });
});

describe('projectUnionMinutes', () => {
  const noBursts = new Map<string, readonly BurstSegment[]>();

  it('unions focus and code evidence per project', () => {
    const f = focus({ project_id: 'p1' }); // 25 min at T0
    const c = session({
      project_id: 'p1',
      ended_at: new Date(T0 + 60 * MIN).toISOString(), // 60 min envelope containing the pomo
    });
    const rows = projectUnionMinutes([f], [c], noBursts);
    expect(rows).toEqual([{ project_id: 'p1', minutes: 60 }]);
  });

  it('keeps projects separate and sorts by minutes', () => {
    const f = focus({ project_id: 'p1' }); // 25 min
    const c = session({
      project_id: 'p2',
      started_at: new Date(T0 + 120 * MIN).toISOString(),
      ended_at: new Date(T0 + 210 * MIN).toISOString(), // 90 min
    });
    const rows = projectUnionMinutes([f], [c], noBursts);
    expect(rows).toEqual([
      { project_id: 'p2', minutes: 90 },
      { project_id: 'p1', minutes: 25 },
    ]);
  });

  it('buckets unattributed work under null', () => {
    const rows = projectUnionMinutes([focus({})], [], noBursts);
    expect(rows).toEqual([{ project_id: null, minutes: 25 }]);
  });

  it('drops projects whose only evidence is a trail-less long envelope', () => {
    const c = session({
      project_id: 'p3',
      status: 'running',
      last_seen_at: new Date(T0 + 10 * 60 * MIN).toISOString(),
    });
    expect(projectUnionMinutes([], [c], noBursts)).toEqual([]);
  });
});

describe('codeEvidenceSpans', () => {
  const noBursts = new Map<string, readonly BurstSegment[]>();

  it('counts a completed session by its full span', () => {
    const s = session({ ended_at: new Date(T0 + 90 * MIN).toISOString() });
    expect(unionMinutes(codeEvidenceSpans([s], noBursts))).toBe(90);
  });

  it('drops a long trail-less envelope entirely', () => {
    const s = session({ status: 'running', last_seen_at: new Date(T0 + 10 * 60 * MIN).toISOString() });
    expect(codeEvidenceSpans([s], noBursts)).toHaveLength(0);
  });

  it('uses the heartbeat trail instead of the envelope when one exists', () => {
    const s = session({
      session_id: 'sess-long',
      status: 'running',
      last_seen_at: new Date(T0 + 10 * 60 * MIN).toISOString(),
    });
    const bursts = new Map([['sess-long', [
      { startMs: T0, endMs: T0 + 30 * MIN, ticks: 5 },
      { startMs: T0 + 8 * 60 * MIN, endMs: T0 + 9 * 60 * MIN, ticks: 12 },
    ]]]);
    expect(unionMinutes(codeEvidenceSpans([s], bursts))).toBe(90);
  });

  it('keeps a short running session at its last-seen span', () => {
    const s = session({ status: 'running', last_seen_at: new Date(T0 + 45 * MIN).toISOString() });
    expect(unionMinutes(codeEvidenceSpans([s], noBursts))).toBe(45);
  });
});
