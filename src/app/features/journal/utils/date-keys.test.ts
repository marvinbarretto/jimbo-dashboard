import { describe, expect, it } from 'vitest';
import {
  dayKeyFromDate,
  dayKeyOf,
  dateFromDayKey,
  daysInMonth,
  daysInWeek,
  isDayKey,
  isMonthKey,
  isWeekKey,
  monthKeyFromDate,
  monthRange,
  shiftDay,
  shiftMonth,
  shiftWeek,
  todayKey,
  weekKeyFromDate,
  weekStartFromKey,
} from './date-keys';

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

describe('isDayKey', () => {
  it('accepts YYYY-MM-DD', () => {
    expect(isDayKey('2024-05-07')).toBe(true);
    expect(isDayKey('2024-01-01')).toBe(true);
    expect(isDayKey('2024-12-31')).toBe(true);
  });

  it('rejects null / undefined / empty', () => {
    expect(isDayKey(null)).toBe(false);
    expect(isDayKey(undefined)).toBe(false);
    expect(isDayKey('')).toBe(false);
  });

  it('rejects partial or wrong-format strings', () => {
    expect(isDayKey('2024-5-7')).toBe(false);
    expect(isDayKey('2024-05')).toBe(false);
    expect(isDayKey('2024-W20')).toBe(false);
    expect(isDayKey('not-a-date')).toBe(false);
  });
});

describe('isWeekKey', () => {
  it('accepts YYYY-Www', () => {
    expect(isWeekKey('2024-W01')).toBe(true);
    expect(isWeekKey('2024-W53')).toBe(true);
  });

  it('rejects non-week strings', () => {
    expect(isWeekKey(null)).toBe(false);
    expect(isWeekKey('2024-05-07')).toBe(false);
    expect(isWeekKey('2024-05')).toBe(false);
  });
});

describe('isMonthKey', () => {
  it('accepts YYYY-MM', () => {
    expect(isMonthKey('2024-01')).toBe(true);
    expect(isMonthKey('2024-12')).toBe(true);
  });

  it('rejects non-month strings', () => {
    expect(isMonthKey(null)).toBe(false);
    expect(isMonthKey('2024-05-07')).toBe(false);
    expect(isMonthKey('2024-W20')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Day key construction
// ---------------------------------------------------------------------------

describe('todayKey', () => {
  it('formats a known date correctly', () => {
    expect(todayKey(new Date(2024, 4, 7))).toBe('2024-05-07');   // May 7
    expect(todayKey(new Date(2024, 0, 1))).toBe('2024-01-01');   // Jan 1
    expect(todayKey(new Date(2024, 11, 31))).toBe('2024-12-31'); // Dec 31
  });
});

describe('dayKeyFromDate / dateFromDayKey round-trip', () => {
  for (const key of ['2024-01-01', '2024-05-07', '2024-12-31', '2024-02-29']) {
    it(`round-trips ${key}`, () => {
      expect(dayKeyFromDate(dateFromDayKey(key))).toBe(key);
    });
  }
});

describe('dayKeyOf', () => {
  it('extracts a date key from a local-time ISO string', () => {
    // No Z suffix → interpreted as local time → avoids timezone flips
    expect(dayKeyOf('2024-05-07T12:00:00')).toBe('2024-05-07');
  });

  it('returns null for null / undefined / empty', () => {
    expect(dayKeyOf(null)).toBeNull();
    expect(dayKeyOf(undefined)).toBeNull();
    expect(dayKeyOf('')).toBeNull();
  });

  it('returns null for invalid strings', () => {
    expect(dayKeyOf('not-a-date')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// shiftDay
// ---------------------------------------------------------------------------

describe('shiftDay', () => {
  it('increments and decrements by one', () => {
    expect(shiftDay('2024-05-07', 1)).toBe('2024-05-08');
    expect(shiftDay('2024-05-07', -1)).toBe('2024-05-06');
  });

  it('crosses month boundary', () => {
    expect(shiftDay('2024-01-31', 1)).toBe('2024-02-01');
    expect(shiftDay('2024-02-01', -1)).toBe('2024-01-31');
  });

  it('crosses year boundary', () => {
    expect(shiftDay('2024-12-31', 1)).toBe('2025-01-01');
    expect(shiftDay('2025-01-01', -1)).toBe('2024-12-31');
  });

  it('handles leap days (2024 is a leap year)', () => {
    expect(shiftDay('2024-02-28', 1)).toBe('2024-02-29');
    expect(shiftDay('2024-02-29', 1)).toBe('2024-03-01');
    expect(shiftDay('2024-03-01', -1)).toBe('2024-02-29');
  });

  it('skips leap day in non-leap year', () => {
    expect(shiftDay('2023-02-28', 1)).toBe('2023-03-01');
  });
});

// ---------------------------------------------------------------------------
// ISO week arithmetic
// ---------------------------------------------------------------------------

describe('weekKeyFromDate', () => {
  // Jan 4 is always in week 1 — the ISO definition anchor.
  it('Jan 4 is always in week 1', () => {
    expect(weekKeyFromDate(new Date(2024, 0, 4))).toBe('2024-W01');
    expect(weekKeyFromDate(new Date(2021, 0, 4))).toBe('2021-W01');
  });

  // 2024-W01 starts Jan 1 (Monday); Jan 4 is its Thursday.
  it('Jan 1, 2024 (Monday) is 2024-W01', () => {
    expect(weekKeyFromDate(new Date(2024, 0, 1))).toBe('2024-W01');
  });

  it('a mid-year date lands in the correct week', () => {
    // May 7, 2024 is a Tuesday; week 19 starts May 6.
    expect(weekKeyFromDate(new Date(2024, 4, 7))).toBe('2024-W19');
  });

  // Year-boundary: Dec 30, 2024 (Mon) — its Thursday is Jan 2, 2025 → 2025-W01.
  it('Dec 30, 2024 belongs to 2025-W01', () => {
    expect(weekKeyFromDate(new Date(2024, 11, 30))).toBe('2025-W01');
  });

  // 2020 has 53 weeks; Dec 28 Mon → Dec 31 Thu (still 2020).
  it('Dec 28, 2020 is 2020-W53', () => {
    expect(weekKeyFromDate(new Date(2020, 11, 28))).toBe('2020-W53');
  });

  // Jan 1, 2021 (Fri) — its Thursday is Dec 31, 2020 → still 2020-W53.
  it('Jan 1, 2021 belongs to 2020-W53', () => {
    expect(weekKeyFromDate(new Date(2021, 0, 1))).toBe('2020-W53');
  });
});

describe('weekStartFromKey', () => {
  it('returns the Monday for a standard week', () => {
    // 2024-W19 starts May 6 (Monday)
    expect(dayKeyFromDate(weekStartFromKey('2024-W19'))).toBe('2024-05-06');
  });

  it('round-trips with weekKeyFromDate', () => {
    for (const k of ['2024-W01', '2024-W19', '2024-W52', '2025-W01', '2020-W53']) {
      expect(weekKeyFromDate(weekStartFromKey(k))).toBe(k);
    }
  });
});

describe('shiftWeek', () => {
  it('advances by one week', () => {
    expect(shiftWeek('2024-W19', 1)).toBe('2024-W20');
  });

  it('goes back by one week', () => {
    expect(shiftWeek('2024-W19', -1)).toBe('2024-W18');
  });

  it('crosses year boundary forward (2024 has 52 weeks)', () => {
    expect(shiftWeek('2024-W52', 1)).toBe('2025-W01');
  });

  it('crosses year boundary backward', () => {
    expect(shiftWeek('2025-W01', -1)).toBe('2024-W52');
  });
});

describe('daysInWeek', () => {
  it('returns 7 days Mon–Sun', () => {
    const days = daysInWeek('2024-W19');
    expect(days).toHaveLength(7);
    expect(days[0]).toBe('2024-05-06'); // Monday
    expect(days[6]).toBe('2024-05-12'); // Sunday
  });
});

// ---------------------------------------------------------------------------
// Month arithmetic
// ---------------------------------------------------------------------------

describe('shiftMonth', () => {
  it('advances and retreats by one month', () => {
    expect(shiftMonth('2024-05', 1)).toBe('2024-06');
    expect(shiftMonth('2024-05', -1)).toBe('2024-04');
  });

  it('crosses year boundary', () => {
    expect(shiftMonth('2024-12', 1)).toBe('2025-01');
    expect(shiftMonth('2025-01', -1)).toBe('2024-12');
  });
});

describe('monthRange', () => {
  it('returns the first and last day for a standard month', () => {
    const { start, end } = monthRange('2024-05');
    expect(start.getDate()).toBe(1);
    expect(start.getMonth()).toBe(4); // 0-indexed May
    expect(end.getDate()).toBe(31);
  });

  it('February end-date respects leap year', () => {
    expect(monthRange('2024-02').end.getDate()).toBe(29); // leap
    expect(monthRange('2023-02').end.getDate()).toBe(28); // non-leap
  });
});

describe('daysInMonth', () => {
  it('returns 31 days for January', () => {
    const days = daysInMonth('2024-01');
    expect(days).toHaveLength(31);
    expect(days[0]).toBe('2024-01-01');
    expect(days[30]).toBe('2024-01-31');
  });

  it('returns 29 days for February in a leap year', () => {
    const days = daysInMonth('2024-02');
    expect(days).toHaveLength(29);
    expect(days[28]).toBe('2024-02-29');
  });

  it('returns 28 days for February in a non-leap year', () => {
    expect(daysInMonth('2023-02')).toHaveLength(28);
  });
});

describe('monthKeyFromDate', () => {
  it('formats correctly', () => {
    expect(monthKeyFromDate(new Date(2024, 4, 7))).toBe('2024-05');
    expect(monthKeyFromDate(new Date(2024, 0, 1))).toBe('2024-01');
  });
});
