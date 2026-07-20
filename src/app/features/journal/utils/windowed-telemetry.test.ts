import { describe, expect, it } from 'vitest';
import type { TelemetryEventLite } from '../data-access/journal-data.service';
import { dedupeWindowedSum } from './windowed-telemetry';

const T0 = Date.parse('2026-07-20T00:00:00Z');
const MIN = 60_000;

// A windowed sample: starts at `startMin`, spans 2h unless overridden.
function win(startMin: number, value: number, spanMin = 120): TelemetryEventLite {
  return {
    id: `w-${startMin}`,
    collector: 'usage',
    type: 'screen_session',
    ts: new Date(T0 + startMin * MIN).toISOString(),
    ts_end: new Date(T0 + (startMin + spanMin) * MIN).toISOString(),
    value,
    unit: 'total_on_seconds',
    source: null,
    payload: null,
  };
}

const val = (e: TelemetryEventLite) => e.value ?? 0;

describe('dedupeWindowedSum', () => {
  it('sums disjoint windows fully', () => {
    expect(dedupeWindowedSum([win(0, 100), win(120, 50)], val)).toBe(150);
  });

  it('does not multiply-count the 30-min sliding emission pattern', () => {
    // Four windows sliding by 30min all covering roughly the same activity:
    // raw summing gives 400; a non-overlapping cover keeps the first, then
    // pro-rates the last one's uncovered 90-minute tail (0:00–2:00 kept,
    // 1:30–3:30 reaches 1.5h past → 100 * 90/120 = 75).
    const events = [win(0, 100), win(30, 100), win(60, 100), win(90, 100)];
    expect(dedupeWindowedSum(events, val)).toBe(175);
  });

  it('handles the real cadence: kept windows resume after gaps', () => {
    // Sleep gap between 04:00 and 08:30 — no windows emitted; both clusters count.
    const events = [win(0, 500), win(30, 500), win(510, 200), win(540, 200)];
    // Cluster 1: keep win(0); win(30) tail = 30min uncovered → 500*30/120=125.
    // Cluster 2: keep win(510); win(540) tail → 200*30/120=50.
    expect(dedupeWindowedSum(events, val)).toBe(875);
  });

  it('ignores exact-duplicate rows', () => {
    // The double-emit seen in prod: two rows seconds apart, same window+value.
    expect(dedupeWindowedSum([win(0, 2880), win(0.5, 2880)], val)).toBeCloseTo(2880 + 2880 * (0.5 / 120), 0);
  });

  it('handles unsorted input and missing ts_end (2h default)', () => {
    const noEnd: TelemetryEventLite = { ...win(120, 50), ts_end: null };
    expect(dedupeWindowedSum([noEnd, win(0, 100)], val)).toBe(150);
  });

  it('returns 0 for no events', () => {
    expect(dedupeWindowedSum([], val)).toBe(0);
  });
});
