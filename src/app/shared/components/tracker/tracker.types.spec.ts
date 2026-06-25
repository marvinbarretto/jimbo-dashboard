import { describe, expect, it } from 'vitest';
import {
  isoToLocalInput,
  localInputToIso,
  measuresFor,
  roundForMeasure,
  sumMeasures,
  type TrackerEntry,
  type TrackerMeasure,
} from './tracker.types';

const MEASURES: TrackerMeasure[] = [
  { key: 'kcal', label: 'calories', unit: 'kcal' },
  { key: 'protein_g', label: 'protein', unit: 'p' },
  { key: 'dose', label: 'dose', kind: 'number' },
];

function entry(id: string, values: Record<string, number | null>, extra: Partial<TrackerEntry> = {}): TrackerEntry {
  return { id, at: '2026-06-25T08:00:00Z', label: id, values, ...extra };
}

describe('sumMeasures', () => {
  it('sums each measure across entries that carry it, ignoring nulls and absent keys', () => {
    const entries = [
      entry('a', { kcal: 300, protein_g: 20 }),
      entry('b', { kcal: 600, protein_g: null }), // null contributes 0
      entry('c', { dose: 5 }), // no kcal/protein keys
    ];
    expect(sumMeasures(entries, MEASURES)).toEqual({ kcal: 900, protein_g: 20, dose: 5 });
  });

  it('returns zeroes for every measure when there are no entries', () => {
    expect(sumMeasures([], MEASURES)).toEqual({ kcal: 0, protein_g: 0, dose: 0 });
  });
});

describe('measuresFor', () => {
  it('keeps only the measures an entry actually carries (heterogeneous rows)', () => {
    const supplement = entry('s', { dose: 5 });
    expect(measuresFor(supplement, MEASURES).map((m) => m.key)).toEqual(['dose']);
  });
});

describe('roundForMeasure', () => {
  it('rounds int measures and preserves decimals for number measures', () => {
    expect(roundForMeasure({ key: 'kcal', label: 'c' }, 12.6)).toBe(13); // default int
    expect(roundForMeasure({ key: 'dose', label: 'd', kind: 'number' }, 2.5)).toBe(2.5);
  });
});

describe('iso <-> datetime-local (Europe/London)', () => {
  it('formats the input in London wall-clock — BST in summer, GMT in winter', () => {
    expect(isoToLocalInput('2026-06-25T08:05:00Z')).toBe('2026-06-25T09:05'); // BST = UTC+1
    expect(isoToLocalInput('2026-01-15T08:05:00Z')).toBe('2026-01-15T08:05'); // GMT = UTC+0
  });

  it('round-trips an instant through the London-input representation (both seasons)', () => {
    for (const iso of ['2026-06-25T08:05:00.000Z', '2026-01-15T08:05:00.000Z']) {
      expect(localInputToIso(isoToLocalInput(iso))).toBe(iso);
    }
  });

  it('interprets the typed wall-clock as London, not UTC', () => {
    // 09:05 on a summer day is BST → 08:05Z, not 09:05Z.
    expect(localInputToIso('2026-06-25T09:05')).toBe('2026-06-25T08:05:00.000Z');
  });

  it('returns null for empty or invalid local input', () => {
    expect(localInputToIso('')).toBeNull();
    expect(localInputToIso('not-a-date')).toBeNull();
  });
});
