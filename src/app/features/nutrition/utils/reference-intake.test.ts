import { describe, expect, it } from 'vitest';
import {
  intakeStatus,
  percentOfDaily,
  percentOfDailyLabel,
  portionBasisLabel,
  shareOfDaily,
} from './reference-intake';

// Figures below are the real ones from a scanned Ginsters Cornish Pasty (227g)
// and a 250ml serving of 1664 — the two products this screen was designed
// against.
describe('shareOfDaily', () => {
  it('measures a portion against the UK reference intake', () => {
    // 16.6g of saturates against a 20g day is most of it, and the number that
    // makes a pasty worth thinking about.
    expect(percentOfDaily('sat_fat_g', 16.6)).toBe(83);
    expect(percentOfDaily('salt_g', 2.1)).toBe(35);
  });

  it('returns null for a nutrient nobody measured', () => {
    expect(shareOfDaily('fiber_g', null)).toBeNull();
    expect(percentOfDaily('fiber_g', undefined)).toBeNull();
    expect(percentOfDailyLabel('salt_g', null)).toBeNull();
  });

  it('returns null for a nutrient with no reference', () => {
    expect(shareOfDaily('not_a_nutrient', 5)).toBeNull();
  });
});

describe('intakeStatus', () => {
  it('escalates a limit as it eats into the day', () => {
    expect(intakeStatus('sat_fat_g', 2)).toBe('neutral'); // 10%
    expect(intakeStatus('sat_fat_g', 7)).toBe('warn'); // 35%
    expect(intakeStatus('sat_fat_g', 16.6)).toBe('alert'); // 83%
  });

  // Failing to hit a day's fibre in one product is not an error, and colouring
  // it like one would cry wolf on every single scan.
  it('never alarms on a nutrient you want more of', () => {
    expect(intakeStatus('fiber_g', 0)).toBe('neutral');
    expect(intakeStatus('fiber_g', 29)).toBe('neutral');
  });

  it('is neutral when the nutrient was not measured', () => {
    expect(intakeStatus('salt_g', null)).toBe('neutral');
  });
});

// The screen's core claim is that nothing measured is ever shown as nothing.
describe('percentOfDailyLabel', () => {
  it('calls a measured trace "<1%" rather than 0%', () => {
    // 0.3g of sugar in a beer is negligible, but a flat 0 next to a non-zero
    // gram figure reads as a contradiction.
    expect(percentOfDailyLabel('sugars_g', 0.3)).toBe('<1% of a day');
  });

  it('still says 0% for a measured zero', () => {
    expect(percentOfDailyLabel('salt_g', 0)).toBe('0% of a day');
  });

  it('rounds normally above the floor', () => {
    expect(percentOfDailyLabel('sat_fat_g', 16.6)).toBe('83% of a day');
  });
});

describe('portionBasisLabel', () => {
  it('names the pack when the pack is the serving', () => {
    expect(portionBasisLabel('pack', 'ml', 330)).toBe('the whole 330ml pack');
  });

  it('falls back gracefully when the pack size is unknown', () => {
    expect(portionBasisLabel('pack', 'g', null)).toBe('the whole pack');
  });

  it('warns plainly when nobody knows the portion', () => {
    // The one case worth cautioning about: the figure above it is a per-100
    // unit wearing a serving's clothes.
    expect(portionBasisLabel('default_100g', 'ml', null)).toContain('check the pack');
  });

  it('describes a manufacturer serving without ceremony', () => {
    expect(portionBasisLabel('serving_size', 'g', 227)).toBe('one manufacturer serving');
  });
});
