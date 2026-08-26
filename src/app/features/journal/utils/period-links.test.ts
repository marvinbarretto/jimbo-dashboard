import { describe, expect, it } from 'vitest';
import { peerKeys, periodContainsToday, granularitiesFor, resolveGranularity } from './period-links';
import { todayKey } from '../../../shared/utils/date-keys';

describe('peerKeys', () => {
  it('day → containing week and month', () => {
    expect(peerKeys('day', '2026-07-20')).toEqual({
      day: '2026-07-20',
      week: '2026-W30',
      month: '2026-07',
    });
  });

  it('week → its Monday as the day peer (past week)', () => {
    expect(peerKeys('week', '2026-W11')).toEqual({
      day: '2026-03-09',
      week: '2026-W11',
      month: '2026-03',
    });
  });

  it('a period containing today prefers today as the day peer', () => {
    const today = todayKey();
    const { week, month } = peerKeys('day', today);
    expect(peerKeys('week', week).day).toBe(today);
    expect(peerKeys('month', month).day).toBe(today);
  });

  it('month → first day as the day peer (past month)', () => {
    expect(peerKeys('month', '2026-02')).toEqual({
      day: '2026-02-01',
      week: '2026-W05',
      month: '2026-02',
    });
  });
});

describe('periodContainsToday', () => {
  it('matches only the current periods', () => {
    const today = todayKey();
    const peers = peerKeys('day', today);
    expect(periodContainsToday('day', today)).toBe(true);
    expect(periodContainsToday('week', peers.week)).toBe(true);
    expect(periodContainsToday('month', peers.month)).toBe(true);
    expect(periodContainsToday('day', '2020-01-01')).toBe(false);
    expect(periodContainsToday('week', '2020-W01')).toBe(false);
    expect(periodContainsToday('month', '2020-01')).toBe(false);
  });
});

describe('domain horizons', () => {
  // A month is too long to act on — by the time a bad one is visible it is
  // over — so Overview stops at a week. Jimbo keeps it because spend is
  // genuinely billed monthly.
  it('offers days and weeks everywhere, and months only where the cycle is monthly', () => {
    expect(granularitiesFor('overview')).toEqual(['day', 'week']);
    expect(granularitiesFor('work')).toEqual(['day', 'week']);
    expect(granularitiesFor('jimbo')).toEqual(['day', 'week', 'month']);
    expect(granularitiesFor('reflect')).toEqual(['day']);
  });

  it('falls back to all three for an unknown domain', () => {
    expect(granularitiesFor('something-new')).toEqual(['day', 'week', 'month']);
  });
});

describe('resolveGranularity', () => {
  it('keeps the horizon when the destination supports it', () => {
    expect(resolveGranularity('overview', 'week')).toBe('week');
    expect(resolveGranularity('jimbo', 'month')).toBe('month');
  });

  // Switching from Jimbo's month to Overview must not land on a horizon
  // Overview will not offer a control to leave.
  it('narrows to the nearest supported horizon', () => {
    expect(resolveGranularity('overview', 'month')).toBe('week');
    expect(resolveGranularity('reflect', 'month')).toBe('day');
    expect(resolveGranularity('reflect', 'week')).toBe('day');
  });
});
