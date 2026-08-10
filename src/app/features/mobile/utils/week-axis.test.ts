import { describe, expect, it } from 'vitest';
import { weekAxis } from './week-axis';

type Row = { date: string; kcal: number };
const rows: Row[] = [
  { date: '2026-08-10', kcal: 2100 },
  { date: '2026-08-08', kcal: 1800 },
];

describe('weekAxis', () => {
  it('builds a continuous 7-day axis ending on the given day, zero-filling gaps', () => {
    const { labels, values } = weekAxis('2026-08-10', rows, (r) => r.date, (r) => r.kcal);
    expect(values).toHaveLength(7);
    expect(values).toEqual([0, 0, 0, 0, 1800, 0, 2100]);
    expect(labels).toHaveLength(7);
  });

  it('labels by weekday — 2026-08-10 is a Monday', () => {
    const { labels } = weekAxis('2026-08-10', rows, (r) => r.date, (r) => r.kcal);
    expect(labels.at(-1)).toBe('Mon');
    expect(labels[0]).toBe('Tue');
  });

  it('ignores rows outside the window', () => {
    const { values } = weekAxis(
      '2026-08-10',
      [{ date: '2026-07-01', kcal: 999 }],
      (r) => r.date,
      (r) => r.kcal,
    );
    expect(values.every((v) => v === 0)).toBe(true);
  });
});
