import { describe, expect, it } from 'vitest';
import { buildDaypartHistogram, rankUsualsForDaypart, type DatedFoodEntry } from './usual-daypart';
import { type Usual } from '../data-access/usuals';

/** A London wall-clock time in August (BST) as a real instant. */
const at = (hour: number, day = 13): string =>
  new Date(Date.UTC(2026, 7, day, hour - 1, 0)).toISOString();

const entry = (raw_text: string, hour: number, day = 13): DatedFoodEntry => ({
  raw_text,
  logged_at: at(hour, day),
});

const usual = (key: string): Usual => ({
  key,
  kcal: 180,
  item: {
    label: key,
    est_kcal: 180,
    est_protein_g: 2,
    est_carbs_g: 15,
    est_fat_g: 0,
    count: 1,
    last_logged_at: at(20),
  },
});

describe('buildDaypartHistogram', () => {
  it('buckets a log into the daypart it happened in', () => {
    const hist = buildDaypartHistogram([entry('1 pale ale', 21)]);
    expect(hist.get('pale ale')).toEqual({ morning: 0, midday: 0, evening: 1, total: 1 });
  });

  it('collapses quantities onto one key, exactly as the chips do', () => {
    const hist = buildDaypartHistogram([entry('1 pale ale', 21), entry('3 pale ale', 22)]);
    expect(hist.get('pale ale')?.total).toBe(2);
    expect(hist.size).toBe(1);
  });

  it('spreads one item across the dayparts it actually spans', () => {
    const hist = buildDaypartHistogram([
      entry('granola', 8),
      entry('granola', 9),
      entry('granola', 14),
    ]);
    expect(hist.get('granola')).toEqual({ morning: 2, midday: 1, evening: 0, total: 3 });
  });

  it('ignores rows it cannot place instead of throwing', () => {
    const hist = buildDaypartHistogram([
      { raw_text: 'mystery', logged_at: 'not-a-date' },
      { raw_text: '   ', logged_at: at(12) },
    ]);
    expect(hist.size).toBe(0);
  });
});

describe('rankUsualsForDaypart', () => {
  const beer = usual('pale ale');
  const granola = usual('granola');
  const candidates = [beer, granola];

  it('puts the evening habit first in the evening', () => {
    const hist = buildDaypartHistogram([
      ...Array.from({ length: 10 }, (_, i) => entry('1 pale ale', 21, (i % 20) + 1)),
      ...Array.from({ length: 30 }, (_, i) => entry('granola', 9, (i % 28) + 1)),
    ]);
    expect(rankUsualsForDaypart(candidates, hist, 'evening', 4)[0]?.key).toBe('pale ale');
  });

  it('and the morning habit first in the morning, even though it is the same data', () => {
    const hist = buildDaypartHistogram([
      ...Array.from({ length: 10 }, (_, i) => entry('1 pale ale', 21, (i % 20) + 1)),
      ...Array.from({ length: 30 }, (_, i) => entry('granola', 9, (i % 28) + 1)),
    ]);
    expect(rankUsualsForDaypart(candidates, hist, 'morning', 4)[0]?.key).toBe('granola');
  });

  it('keeps an out-of-hours favourite on the grid rather than dropping it', () => {
    // Never logged in the morning, but frequent enough to still be worth a slot.
    const hist = buildDaypartHistogram(
      Array.from({ length: 20 }, (_, i) => entry('1 pale ale', 21, (i % 28) + 1)),
    );
    const ranked = rankUsualsForDaypart(candidates, hist, 'morning', 4);
    expect(ranked.map((u) => u.key)).toContain('pale ale');
  });

  it('degrades to the incoming order when there is no history at all', () => {
    const ranked = rankUsualsForDaypart(candidates, new Map(), 'evening', 4);
    expect(ranked.map((u) => u.key)).toEqual(['pale ale', 'granola']);
  });

  it('truncates to the slot count the grid can actually show', () => {
    expect(rankUsualsForDaypart(candidates, new Map(), 'evening', 1)).toHaveLength(1);
    expect(rankUsualsForDaypart(candidates, new Map(), 'evening', 0)).toHaveLength(0);
  });

  it('does not mutate the array it was handed', () => {
    const input = [beer, granola];
    rankUsualsForDaypart(input, new Map(), 'morning', 2);
    expect(input).toEqual([beer, granola]);
  });
});
