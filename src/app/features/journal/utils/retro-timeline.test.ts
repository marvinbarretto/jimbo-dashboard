import { describe, expect, it } from 'vitest';
import type { TelemetryEventLite } from '../data-access/journal-data.service';
import {
  assignColumns,
  commitPins,
  timelineWindow,
  youtubeEpisodes,
  type RetroInterval,
} from './retro-timeline';

const T0 = Date.parse('2026-07-18T10:00:00Z');
const MIN = 60_000;

function ytSeg(offsetMin: number, title: string | null = 'Video A', seconds = 60): TelemetryEventLite {
  return {
    id: `yt-${offsetMin}`,
    collector: 'youtube',
    type: 'watch_session',
    ts: new Date(T0 + offsetMin * MIN).toISOString(),
    value: seconds,
    unit: 'seconds',
    source: null,
    payload: title ? { title } : {},
  };
}

function push(commits: Array<{ offsetMin: number; subject: string }>): TelemetryEventLite {
  return {
    id: `push-${commits[0]?.offsetMin ?? 0}`,
    collector: 'github',
    type: 'push',
    ts: new Date(T0).toISOString(),
    value: null,
    unit: null,
    source: 'me/repo',
    payload: {
      commits: commits.map(c => ({
        sha: 'abc',
        subject: c.subject,
        author_date: new Date(T0 + c.offsetMin * MIN).toISOString(),
      })),
    },
  };
}

function iv(startMin: number, endMin: number, id = `${startMin}-${endMin}`): RetroInterval {
  return {
    id,
    lane: 'desk',
    source: 'code',
    startMs: T0 + startMin * MIN,
    endMs: T0 + endMin * MIN,
    label: id,
    detail: null,
  };
}

describe('youtubeEpisodes', () => {
  it('merges adjacent segments into one episode labelled by dominant title', () => {
    const events = [
      ytSeg(0, 'Video A'),
      ytSeg(1, 'Video A'),
      ytSeg(2, 'Video B'),
    ];
    const eps = youtubeEpisodes(events);
    expect(eps).toHaveLength(1);
    expect(eps[0].label).toBe('Video A');
    expect(eps[0].detail).toBe('+1 more video');
    expect(eps[0].startMs).toBe(T0);
    expect(eps[0].endMs).toBe(T0 + 3 * MIN);
  });

  it('splits episodes across gaps beyond the tolerance', () => {
    const eps = youtubeEpisodes([ytSeg(0), ytSeg(30)]);
    expect(eps).toHaveLength(2);
  });

  it('keeps segments within the 10-minute gap in one episode', () => {
    const eps = youtubeEpisodes([ytSeg(0), ytSeg(9)]);
    expect(eps).toHaveLength(1);
  });

  it('handles unsorted input and missing titles', () => {
    const eps = youtubeEpisodes([ytSeg(5, null), ytSeg(0, null)]);
    expect(eps).toHaveLength(1);
    expect(eps[0].label).toBe('YouTube');
  });
});

describe('commitPins', () => {
  it('clusters commits within 15 minutes into one pin', () => {
    const pins = commitPins([push([
      { offsetMin: 0, subject: 'feat: one' },
      { offsetMin: 10, subject: 'fix: two' },
    ])]);
    expect(pins).toHaveLength(1);
    expect(pins[0].count).toBe(2);
    expect(pins[0].label).toBe('2 commits');
    expect(pins[0].items).toEqual(['feat: one', 'fix: two']);
  });

  it('keeps distant commits as separate single pins labelled by subject', () => {
    const pins = commitPins([push([
      { offsetMin: 0, subject: 'feat: one' },
      { offsetMin: 60, subject: 'fix: two' },
    ])]);
    expect(pins).toHaveLength(2);
    expect(pins[0].label).toBe('feat: one');
  });

  it('chains: each commit within window of the previous extends the cluster', () => {
    const pins = commitPins([push([
      { offsetMin: 0, subject: 'a' },
      { offsetMin: 14, subject: 'b' },
      { offsetMin: 28, subject: 'c' },
    ])]);
    expect(pins).toHaveLength(1);
    expect(pins[0].count).toBe(3);
  });
});

describe('assignColumns', () => {
  it('gives a lone interval the full lane', () => {
    const [a] = assignColumns([iv(0, 60)]);
    expect(a.col).toBe(0);
    expect(a.cols).toBe(1);
  });

  it('splits overlapping intervals into columns', () => {
    const out = assignColumns([iv(0, 60, 'a'), iv(30, 90, 'b')]);
    const a = out.find(o => o.id === 'a')!;
    const b = out.find(o => o.id === 'b')!;
    expect(a.cols).toBe(2);
    expect(b.cols).toBe(2);
    expect(a.col).not.toBe(b.col);
  });

  it('does not treat touching intervals as overlapping', () => {
    const out = assignColumns([iv(0, 60, 'a'), iv(60, 120, 'b')]);
    expect(out.every(o => o.cols === 1)).toBe(true);
  });

  it('keeps separate overlap groups independent', () => {
    const out = assignColumns([iv(0, 60, 'a'), iv(30, 90, 'b'), iv(120, 180, 'c')]);
    expect(out.find(o => o.id === 'c')!.cols).toBe(1);
  });

  it('a contained interval splits its container, not unrelated blocks', () => {
    // Pomodoro inside a long code session — the common desk-lane case.
    const out = assignColumns([iv(0, 240, 'code'), iv(30, 55, 'pomo'), iv(300, 330, 'later')]);
    expect(out.find(o => o.id === 'code')!.cols).toBe(2);
    expect(out.find(o => o.id === 'pomo')!.cols).toBe(2);
    expect(out.find(o => o.id === 'later')!.cols).toBe(1);
  });
});

describe('timelineWindow', () => {
  const dayStart = Date.parse('2026-07-18T00:00:00Z');

  // Interval at minute offsets from the day start (iv() above offsets from
  // T0 = 10:00, which these window assertions must not inherit).
  function ivd(startMin: number, endMin: number): RetroInterval {
    return { ...iv(0, 1), id: `d-${startMin}`, startMs: dayStart + startMin * MIN, endMs: dayStart + endMin * MIN };
  }

  it('pads the data range by an hour and snaps to hour boundaries', () => {
    const w = timelineWindow(dayStart, [ivd(600, 630)], []); // 10:00–10:30
    expect(w.startMs).toBe(dayStart + 9 * 60 * MIN);
    expect(w.endMs).toBe(dayStart + 12 * 60 * MIN);
  });

  it('clamps to the day boundaries', () => {
    const w = timelineWindow(dayStart, [ivd(-120, 30), ivd(1380, 1500)], []);
    expect(w.startMs).toBe(dayStart);
    expect(w.endMs).toBe(dayStart + 24 * 60 * MIN);
  });

  it('falls back to a working-hours window on an empty day', () => {
    const w = timelineWindow(dayStart, [], []);
    expect(w.startMs).toBe(dayStart + 8 * 60 * MIN);
    expect(w.endMs).toBe(dayStart + 20 * 60 * MIN);
  });

  it('extends to cover pins', () => {
    const w = timelineWindow(dayStart, [ivd(600, 660)], [
      { id: 'p', tsMs: dayStart + 120 * MIN, count: 1, label: 'x', items: ['x'] },
    ]);
    expect(w.startMs).toBe(dayStart + 60 * MIN);
  });
});
