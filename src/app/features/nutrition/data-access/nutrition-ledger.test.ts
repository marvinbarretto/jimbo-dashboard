import { describe, expect, it } from 'vitest';
import {
  foodChanges,
  foodToEntry,
  isAlcoholicDrink,
  splitId,
  suppChanges,
  suppToEntry,
} from './nutrition-ledger';
import type { FoodItem, FoodLogEntry, SupplementLogEntry } from './nutrition.service';

// Builders over mocks, per testing conventions. Macro numbers in the alcohol
// tests are real product values — the Atwater residual heuristic is calibrated
// against actual drinks, so contrived numbers would test nothing.

function buildItem(overrides: Partial<FoodItem> = {}): FoodItem {
  return {
    label: 'item',
    kind: 'food',
    qty: 1,
    kcal: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    ...overrides,
  };
}

function buildFood(overrides: Partial<FoodLogEntry> = {}): FoodLogEntry {
  return {
    id: 'f1',
    raw_text: 'two eggs on toast',
    logged_at: '2026-08-10T08:30:00.000Z',
    items: [],
    est_kcal: 420,
    est_protein_g: 22,
    est_carbs_g: 30,
    est_fat_g: 21,
    source: 'telegram',
    ...overrides,
  } as FoodLogEntry;
}

function buildSupp(overrides: Partial<SupplementLogEntry> = {}): SupplementLogEntry {
  return {
    id: 7,
    name: 'Creatine',
    taken_at: '2026-08-10T09:00:00.000Z',
    dosage: 5,
    dose_unit: 'g',
    ...overrides,
  } as SupplementLogEntry;
}

describe('isAlcoholicDrink', () => {
  it('never flags food, whatever the macros claim', () => {
    expect(isAlcoholicDrink(buildItem({ kind: 'food', kcal: 900 }))).toBe(false);
  });

  it('trusts an explicit alcoholic=true over the residual', () => {
    // Low-cal spirit with diet mixer: residual under the margin, flag correct.
    expect(
      isAlcoholicDrink(buildItem({ kind: 'drink', kcal: 60, carbs_g: 0, alcoholic: true })),
    ).toBe(true);
  });

  it('trusts an explicit alcoholic=false over the residual', () => {
    // 0.0% beer reads like beer to the heuristic — the flag is the only thing
    // that gets it right, which is why the flag wins.
    expect(
      isAlcoholicDrink(buildItem({ kind: 'drink', kcal: 70, carbs_g: 5, alcoholic: false })),
    ).toBe(false);
  });

  it('falls back to the Atwater residual for pre-flag entries: beer clears it', () => {
    // Pint of 4.5% lager: ~209 kcal, macros explain ~75 — ethanol is the rest.
    expect(
      isAlcoholicDrink(buildItem({ kind: 'drink', kcal: 209, protein_g: 1.6, carbs_g: 17 })),
    ).toBe(true);
  });

  it('falls back for pre-flag entries: coke sits at zero residual', () => {
    // 330ml coke: 139 kcal, 35g sugar — fully explained by carbs.
    expect(isAlcoholicDrink(buildItem({ kind: 'drink', kcal: 139, carbs_g: 35 }))).toBe(false);
  });
});

describe('splitId', () => {
  it('routes the supp prefix', () => {
    expect(splitId('supp:42')).toEqual({ kind: 'supp', id: '42' });
  });

  it('routes the food prefix', () => {
    expect(splitId('food:abc-123')).toEqual({ kind: 'food', id: 'abc-123' });
  });

  it('keeps colons inside the raw id intact', () => {
    expect(splitId('food:2026-08-10T08:30:00Z')).toEqual({ kind: 'food', id: '2026-08-10T08:30:00Z' });
  });
});

describe('foodToEntry', () => {
  it('marks entries awaiting the LLM estimate as pending', () => {
    expect(foodToEntry(buildFood({ est_kcal: null })).pending).toBe(true);
    expect(foodToEntry(buildFood({ est_kcal: 420 })).pending).toBe(false);
  });

  it('prefixes the id for write-dispatch round-tripping', () => {
    const entry = foodToEntry(buildFood({ id: 'x1' }));
    expect(splitId(entry.id)).toEqual({ kind: 'food', id: 'x1' });
  });
});

describe('suppToEntry', () => {
  it('locks the label — the name is catalog-owned', () => {
    expect(suppToEntry(buildSupp()).labelEditable).toBe(false);
  });

  it('carries the per-supplement dose unit', () => {
    expect(suppToEntry(buildSupp({ dose_unit: 'mg' })).units).toEqual({ dose: 'mg' });
  });
});

describe('foodChanges', () => {
  it('maps only the fields present in the patch', () => {
    expect(foodChanges({ label: 'one egg' })).toEqual({ raw_text: 'one egg' });
    expect(foodChanges({ at: '2026-08-10T12:00:00Z' })).toEqual({ logged_at: '2026-08-10T12:00:00Z' });
  });

  it('distinguishes an explicit null macro from an absent one', () => {
    // Clearing a bad estimate (null) must reach the API; untouched keys must not.
    expect(foodChanges({ values: { kcal: null } })).toEqual({ est_kcal: null });
    expect(foodChanges({ values: { protein_g: 12 } })).toEqual({ est_protein_g: 12 });
  });
});

describe('suppChanges', () => {
  it('maps timestamp and numeric dose', () => {
    expect(suppChanges({ at: '2026-08-10T21:00:00Z', values: { dose: 10 } })).toEqual({
      taken_at: '2026-08-10T21:00:00Z',
      dosage: 10,
    });
  });

  it('drops a cleared dose rather than sending NaN', () => {
    expect(suppChanges({ values: { dose: null } })).toEqual({});
  });
});
