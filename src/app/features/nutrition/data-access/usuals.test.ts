import { describe, expect, it } from 'vitest';
import { buildUsuals, tallyUsuals, usualKey } from './usuals';
import type { FrequentFood } from './nutrition.service';

// Builders over mocks, per testing conventions.
function frequent(overrides: Partial<FrequentFood> & { label: string }): FrequentFood {
  return {
    est_kcal: 100,
    est_protein_g: null,
    est_carbs_g: null,
    est_fat_g: null,
    count: 1,
    last_logged_at: '2026-08-01T12:00:00.000Z',
    ...overrides,
  };
}

describe('usualKey', () => {
  it('strips a leading quantity and normalises case/whitespace', () => {
    expect(usualKey('3 Pale Ale ')).toBe('pale ale');
    expect(usualKey('Guinness')).toBe('guinness');
  });

  it('leaves labels that start with a non-quantity number alone-ish', () => {
    // "0%" style labels keep their identity — only "<digits><space>" strips.
    expect(usualKey('0% greek yoghurt')).toBe('0% greek yoghurt');
  });
});

describe('buildUsuals', () => {
  it('dedupes quantity variants onto one chip and drops macro-less rows', () => {
    const usuals = buildUsuals([
      frequent({ label: '1 pale ale', est_kcal: 180 }),
      frequent({ label: '3 pale ale', est_kcal: 540 }),
      frequent({ label: 'mystery snack', est_kcal: null }),
      frequent({ label: 'porridge', est_kcal: 320.4 }),
    ]);
    expect(usuals.map((u) => u.key)).toEqual(['pale ale', 'porridge']);
    expect(usuals[0].kcal).toBe(180); // first (highest-count) variant wins
    expect(usuals[1].kcal).toBe(320); // rounded for the chip
  });

  it('keeps the server frequency order when everything fits', () => {
    const usuals = buildUsuals([frequent({ label: 'a' }), frequent({ label: 'b' })], { max: 6 });
    expect(usuals.map((u) => u.key)).toEqual(['a', 'b']);
  });

  it('reserves recentSlots for newly-logged foods the frequency top would bury', () => {
    const items = [
      frequent({ label: 'coffee', count: 90, last_logged_at: '2026-08-10T08:00:00.000Z' }),
      frequent({ label: 'porridge', count: 80, last_logged_at: '2026-08-10T07:00:00.000Z' }),
      frequent({ label: 'guinness', count: 70, last_logged_at: '2026-07-01T20:00:00.000Z' }),
      frequent({ label: 'banana', count: 60, last_logged_at: '2026-06-01T10:00:00.000Z' }),
      // Newcomer: logged twice this week, nowhere near the lifetime counts.
      frequent({ label: 'overnight oats', count: 2, last_logged_at: '2026-08-11T07:30:00.000Z' }),
    ];
    const usuals = buildUsuals(items, { max: 4, recentSlots: 2 });
    expect(usuals.map((u) => u.key)).toEqual([
      'coffee',
      'porridge',
      // Recency slots: newest first, keys already present skipped.
      'overnight oats',
      'guinness',
    ]);
  });

  it('recentSlots 0 is pure frequency', () => {
    const items = [
      frequent({ label: 'a', count: 3 }),
      frequent({ label: 'b', count: 2 }),
      frequent({ label: 'new', count: 1, last_logged_at: '2026-08-11T09:00:00.000Z' }),
    ];
    expect(buildUsuals(items, { max: 2, recentSlots: 0 }).map((u) => u.key)).toEqual(['a', 'b']);
  });

  it('tolerates rows without last_logged_at (API not yet redeployed)', () => {
    const items = [
      frequent({ label: 'a', count: 3 }),
      { ...frequent({ label: 'b', count: 2 }), last_logged_at: undefined as unknown as string },
      frequent({ label: 'c', count: 1, last_logged_at: '2026-08-11T09:00:00.000Z' }),
    ];
    expect(buildUsuals(items, { max: 2, recentSlots: 1 }).map((u) => u.key)).toEqual(['a', 'c']);
  });
});

describe('tallyUsuals', () => {
  it('counts by usualKey so "2 pale ale" tallies onto the pale ale chip', () => {
    const tally = tallyUsuals(['1 pale ale', '2 pale ale', 'porridge']);
    expect(tally.get('pale ale')).toBe(2);
    expect(tally.get('porridge')).toBe(1);
    expect(tally.get('guinness')).toBeUndefined();
  });
});
