import { describe, expect, it } from 'vitest';
import {
  createUsualLogger,
  foodChanges,
  foodToEntry,
  isAlcoholicDrink,
  splitId,
  suppChanges,
  suppToEntry,
} from './nutrition-ledger';
import type { FoodItem, FoodLogEntry, NutritionService, SupplementLogEntry } from './nutrition.service';
import type { ToastService } from '@shared/components/toast/toast.service';
import type { Usual } from './usuals';

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

describe('createUsualLogger', () => {
  // Builders over mocks: a stub service capturing the body, a recording toast.
  function build(opts: { fail?: boolean; loggedAt?: () => string | undefined } = {}) {
    const created: unknown[] = [];
    const deleted: string[] = [];
    const toasts: string[] = [];
    let settle: (() => void) | undefined;
    let undo: (() => void) | undefined;
    const service = {
      createFood(body: unknown) {
        created.push(body);
        return {
          subscribe(observer: { next: (v: unknown) => void; error: (e: unknown) => void }) {
            // Settlement is manual so tests can observe the in-flight state.
            settle = () =>
              opts.fail ? observer.error(new Error('nope')) : observer.next({ id: 'food_new' });
          },
        };
      },
      deleteFood(id: string) {
        deleted.push(id);
        return { subscribe: (o: { next: (v: unknown) => void }) => o.next(undefined) };
      },
    } as unknown as NutritionService;
    const toast = {
      success: (m: string) => toasts.push(`ok:${m}`),
      error: (m: string) => toasts.push(`err:${m}`),
      info: () => {},
      actionable: (m: string, action: { label: string; run: () => void }, o?: { tone?: string }) => {
        toasts.push(`${o?.tone === 'success' ? 'ok' : 'info'}:${m}`);
        undo = action.run;
      },
    } as unknown as ToastService;
    let loggedCount = 0;
    const logger = createUsualLogger({
      service,
      toast,
      loggedAt: opts.loggedAt,
      onLogged: () => loggedCount++,
    });
    return {
      logger,
      created,
      deleted,
      toasts,
      settle: () => settle?.(),
      undo: () => undo?.(),
      hasUndo: () => undo !== undefined,
      loggedCount: () => loggedCount,
    };
  }

  const usual: Usual = {
    key: 'pale ale',
    kcal: 180,
    item: {
      label: '1 pale ale',
      est_kcal: 180.4,
      est_protein_g: 2,
      est_carbs_g: 15,
      est_fat_g: 0,
      count: 12,
      last_logged_at: '2026-08-10T18:00:00.000Z',
    },
  };

  it('POSTs the last-known macros verbatim and reports on landing', () => {
    const t = build();
    t.logger.log(usual);
    expect(t.created).toEqual([
      { raw_text: '1 pale ale', est_kcal: 180.4, est_protein_g: 2, est_carbs_g: 15, est_fat_g: 0 },
    ]);
    expect(t.loggedCount()).toBe(0); // not before the POST lands
    t.settle();
    expect(t.loggedCount()).toBe(1);
    expect(t.toasts).toEqual(['ok:pale ale · 180 kcal logged']);
  });

  it('drops a re-tap while in flight, allows one after landing', () => {
    const t = build();
    t.logger.log(usual);
    expect(t.logger.pending().has('pale ale')).toBe(true);
    t.logger.log(usual); // double-tap jitter
    expect(t.created).toHaveLength(1);
    t.settle();
    expect(t.logger.pending().has('pale ale')).toBe(false);
    t.logger.log(usual); // the second pint
    expect(t.created).toHaveLength(2);
  });

  it('offers an undo that deletes the entry it just created', () => {
    // The observed duplicate logs (three at 20:14, two at 20:36) are mistaps,
    // not a broken guard — a real second pint is a real second tap. So the fix
    // is a way back, not a debounce that would break the legitimate case.
    const t = build();
    t.logger.log(usual);
    t.settle();
    expect(t.hasUndo()).toBe(true);
    t.undo();
    expect(t.deleted).toEqual(['food_new']);
    expect(t.loggedCount()).toBe(2); // the ledger refreshes after the undo too
  });

  it('offers no undo when the log never landed', () => {
    const t = build({ fail: true });
    t.logger.log(usual);
    t.settle();
    expect(t.hasUndo()).toBe(false);
  });

  it('backdates via loggedAt and clears pending on error', () => {
    const t = build({ fail: true, loggedAt: () => '2026-08-09T12:00:00.000Z' });
    t.logger.log(usual);
    expect(t.created[0]).toMatchObject({ logged_at: '2026-08-09T12:00:00.000Z' });
    t.settle();
    expect(t.logger.pending().has('pale ale')).toBe(false);
    expect(t.toasts).toEqual(['err:Could not log pale ale']);
    expect(t.loggedCount()).toBe(0);
  });
});
