import { describe, it, expect } from 'vitest';
import { dateKey, shiftIsoDays } from './calendar-board.utils';

describe('dateKey', () => {
  it('formats a local date as zero-padded YYYY-MM-DD', () => {
    expect(dateKey(new Date(2026, 0, 5))).toBe('2026-01-05'); // Jan is month 0
    expect(dateKey(new Date(2026, 11, 31))).toBe('2026-12-31');
  });
});

describe('shiftIsoDays — all-day (date-only, UTC)', () => {
  it('advances and rewinds by whole days', () => {
    expect(shiftIsoDays('2026-07-24', 1)).toBe('2026-07-25');
    expect(shiftIsoDays('2026-07-24', -1)).toBe('2026-07-23');
  });

  it('rolls over month and year boundaries', () => {
    expect(shiftIsoDays('2026-07-31', 1)).toBe('2026-08-01');
    expect(shiftIsoDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(shiftIsoDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('handles a leap day', () => {
    expect(shiftIsoDays('2028-02-28', 1)).toBe('2028-02-29');
  });
});

describe('shiftIsoDays — timed instants', () => {
  it('preserves wall-clock time-of-day one day later, in any timezone', () => {
    const start = '2026-07-24T14:30:00.000Z';
    const shifted = shiftIsoDays(start, 1);
    const before = new Date(start);
    const after = new Date(shifted);
    // Local time-of-day is unchanged; the local calendar date advanced by one.
    expect(after.getHours()).toBe(before.getHours());
    expect(after.getMinutes()).toBe(before.getMinutes());
    const dayDiff = (after.getFullYear() - before.getFullYear()) * 365
      + (after.getDate() - before.getDate());
    expect(after.getTime()).toBeGreaterThan(before.getTime());
    expect(Math.abs(after.getTime() - before.getTime())).toBeLessThanOrEqual(26 * 3600_000);
    expect(dayDiff).not.toBe(0);
  });

  it('returns a full ISO instant, not a bare date', () => {
    expect(shiftIsoDays('2026-07-24T09:00:00.000Z', -1)).toMatch(/T\d{2}:\d{2}/);
  });
});
