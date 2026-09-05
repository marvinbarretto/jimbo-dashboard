import { describe, it, expect } from 'vitest';
import { runElapsed } from './run-elapsed';

describe('runElapsed', () => {
  it('formats a sub-minute run in seconds', () => {
    // Dispatch 5016: 20 seconds, which is the tell that it never did the work.
    expect(runElapsed('2026-09-04T20:12:34.659Z', '2026-09-04T20:12:54.448Z')).toBe('20s');
  });

  it('formats a whole number of minutes without a stray 0s', () => {
    expect(runElapsed('2026-09-04T16:00:00Z', '2026-09-04T16:03:00Z')).toBe('3m');
  });

  it('formats minutes and seconds', () => {
    // Dispatch 4971 — the "ran 1m 57s" the card used to show.
    expect(runElapsed('2026-09-04T12:00:00Z', '2026-09-04T12:01:57Z')).toBe('1m 57s');
  });

  it('formats a long run', () => {
    expect(runElapsed('2026-09-04T16:13:36Z', '2026-09-04T16:30:07Z')).toBe('16m 31s');
  });

  // A run in flight gets no number at all: a duration that grows while nobody
  // is watching reads as progress, and 5029 spent 17 minutes not making any.
  it('gives no duration for a run that has not finished', () => {
    expect(runElapsed('2026-09-04T16:13:36Z', null)).toBeNull();
  });

  it('gives no duration for a run that never started', () => {
    expect(runElapsed(null, '2026-09-04T16:30:07Z')).toBeNull();
    expect(runElapsed(null, null)).toBeNull();
  });

  // Both of these must stay null rather than collapsing to "0s", which would
  // read as an instant success.
  it('gives no duration when the timestamps are unparseable', () => {
    expect(runElapsed('not-a-date', '2026-09-04T16:30:07Z')).toBeNull();
  });

  it('gives no duration when the clock ran backwards', () => {
    expect(runElapsed('2026-09-04T16:30:07Z', '2026-09-04T16:13:36Z')).toBeNull();
  });

  it('rounds to the nearest second rather than truncating', () => {
    expect(runElapsed('2026-09-04T16:00:00.000Z', '2026-09-04T16:00:00.700Z')).toBe('1s');
  });
});
