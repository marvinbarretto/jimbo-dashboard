import { describe, expect, it } from 'vitest';
import { periodWindow } from './period-window';

describe('periodWindow', () => {
  it('day window is the anchor only', () => {
    expect(periodWindow('day', '2026-06-25')).toMatchObject({
      start: '2026-06-25',
      end: '2026-06-25',
      elapsedDays: 1,
    });
  });

  it('week window is Monday→Sunday, elapsedDays counts to the anchor', () => {
    // 2026-06-25 is a Thursday → Mon 22nd .. Sun 28th, 4 days elapsed.
    expect(periodWindow('week', '2026-06-25')).toMatchObject({
      start: '2026-06-22',
      end: '2026-06-28',
      elapsedDays: 4,
    });
  });

  it('clamps the month window to the real last day (30-day month)', () => {
    expect(periodWindow('month', '2026-06-15')).toMatchObject({
      start: '2026-06-01',
      end: '2026-06-30',
      elapsedDays: 15,
    });
  });

  it('handles February in a non-leap year (28 days, no spill)', () => {
    expect(periodWindow('month', '2026-02-10')).toMatchObject({
      start: '2026-02-01',
      end: '2026-02-28',
      elapsedDays: 10,
    });
  });

  // Browsing a past period (route-driven pages pass the real `today`
  // explicitly) should report the full span, not an anchor-relative partial
  // count — a completed week/month has fully "elapsed".
  it('reports the full span for a completed week (today after the window)', () => {
    expect(periodWindow('week', '2026-06-25', '2026-07-02')).toMatchObject({
      start: '2026-06-22',
      end: '2026-06-28',
      elapsedDays: 7,
    });
  });

  it('reports the full span for a completed month (today after the window)', () => {
    expect(periodWindow('month', '2026-06-15', '2026-07-02')).toMatchObject({
      start: '2026-06-01',
      end: '2026-06-30',
      elapsedDays: 30,
    });
  });

  it('reports days-so-far for the current month when today is mid-window', () => {
    // Anchor is the 1st (start of month), but today is the 15th — elapsedDays
    // should track today, not the anchor.
    expect(periodWindow('month', '2026-06-01', '2026-06-15')).toMatchObject({
      start: '2026-06-01',
      end: '2026-06-30',
      elapsedDays: 15,
    });
  });

  it('clamps elapsedDays to 1 for a period entirely in the future', () => {
    expect(periodWindow('week', '2026-06-25', '2026-06-01')).toMatchObject({
      start: '2026-06-22',
      end: '2026-06-28',
      elapsedDays: 1,
    });
  });
});
