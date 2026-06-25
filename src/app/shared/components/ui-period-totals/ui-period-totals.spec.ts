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
});
