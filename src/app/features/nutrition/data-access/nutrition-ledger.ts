import { signal } from '@angular/core';
import {
  type TrackerDraft,
  type TrackerEntry,
  type TrackerPatch,
} from '@shared/components/tracker/tracker.types';
import { type ToastService } from '@shared/components/toast/toast.service';
import { type Usual } from './usuals';
import {
  type NutritionService,
  type FoodItem,
  type FoodLogEntry,
  type FoodPatch,
  type SupplementLogEntry,
  type SupplementPatch,
} from './nutrition.service';

/**
 * Domain ↔ tracker mapping for the nutrition ledger, shared by the desktop
 * period page and the phone shell's Log tab.
 *
 * Pure on purpose: both surfaces read the same rows and write through the same
 * endpoints, so only the framing differs. Keeping the translation here means a
 * change to how a food row reads (or what counts as alcohol) lands on both.
 */

// Whether a drink counts as alcohol (we then count its whole kcal). Hybrid:
// trust the LLM's `alcoholic` flag when present — it read the name at ingest and
// correctly handles 0.0%/alcohol-free drinks a heuristic would misjudge. Fall
// back to the Atwater residual (kcal − 4·P − 4·C − 9·F isolates ethanol) only for
// older/manual entries that predate the flag; soft drinks sit near 0, beer/wine
// clear the margin comfortably.
const ALCOHOL_RESIDUAL_MIN = 30;

export function isAlcoholicDrink(it: FoodItem): boolean {
  if (it.kind !== 'drink') return false;
  if (typeof it.alcoholic === 'boolean') return it.alcoholic;
  const macroKcal = 4 * it.protein_g + 4 * it.carbs_g + 9 * it.fat_g;
  return it.kcal - macroKcal > ALCOHOL_RESIDUAL_MIN;
}

export function foodToEntry(f: FoodLogEntry): TrackerEntry {
  return {
    id: `food:${f.id}`,
    at: f.logged_at,
    label: f.raw_text,
    kind: 'food',
    pending: f.est_kcal === null,
    values: { kcal: f.est_kcal, protein_g: f.est_protein_g, carbs_g: f.est_carbs_g, fat_g: f.est_fat_g },
  };
}

export function suppToEntry(s: SupplementLogEntry): TrackerEntry {
  return {
    id: `supp:${s.id}`,
    at: s.taken_at,
    label: s.name,
    kind: 'supplement',
    labelEditable: false, // name is catalog-owned
    values: { dose: s.dosage },
    units: { dose: s.dose_unit },
  };
}

export function foodChanges(c: TrackerPatch['changes']): FoodPatch {
  const out: FoodPatch = {};
  if (c.label !== undefined) out.raw_text = c.label;
  if (c.at !== undefined) out.logged_at = c.at;
  const v = c.values;
  if (v) {
    if ('kcal' in v) out.est_kcal = v['kcal'];
    if ('protein_g' in v) out.est_protein_g = v['protein_g'];
    if ('carbs_g' in v) out.est_carbs_g = v['carbs_g'];
    if ('fat_g' in v) out.est_fat_g = v['fat_g'];
  }
  return out;
}

export function suppChanges(c: TrackerPatch['changes']): SupplementPatch {
  const out: SupplementPatch = {};
  if (c.at !== undefined) out.taken_at = c.at;
  const dose = c.values?.['dose'];
  if (typeof dose === 'number') out.dosage = dose;
  return out;
}

export function splitId(id: string): { kind: 'food' | 'supp'; id: string } {
  const [kind, ...rest] = id.split(':');
  return { kind: kind === 'supp' ? 'supp' : 'food', id: rest.join(':') };
}

/**
 * The write side of the ledger — add/patch/remove with toast feedback —
 * shared by both surfaces so the dispatch-by-id-prefix logic and error copy
 * can't drift between them. Callers supply only what differs: which resources
 * to reload after each kind of write.
 */
/**
 * The write side of the "Usuals" chip row — shared by the phone shell's Log
 * tab and the desktop day view, like createLedgerWriters, so the copy and
 * double-tap policy can't drift. A tap POSTs the chip's last-known macros
 * verbatim (no LLM round-trip); the second pint is a second tap.
 */
export function createUsualLogger(deps: {
  service: NutritionService;
  toast: ToastService;
  /** Vibration feedback; no-ops off-phone. Omit where there's no thumb. */
  haptics?: { tap(): void };
  /** ISO timestamp to log at — the desktop day view backdates to the viewed
   * day here. Return undefined for server-stamped "now". */
  loggedAt?: () => string | undefined;
  onLogged: () => void;
}) {
  const { service, toast, haptics, loggedAt, onLogged } = deps;

  // Per-chip in-flight guard: a mid-flight re-tap is dropped (double-tap
  // jitter), but once the POST lands the same chip logs another — by design.
  const pending = signal<ReadonlySet<string>>(new Set());
  const clearPending = (key: string): void => {
    pending.update((s) => {
      const next = new Set(s);
      next.delete(key);
      return next;
    });
  };

  return {
    pending: pending.asReadonly(),

    log(u: Usual): void {
      if (pending().has(u.key)) return;
      pending.update((s) => new Set(s).add(u.key));
      haptics?.tap();
      const at = loggedAt?.();
      service
        .createFood({
          raw_text: u.item.label,
          est_kcal: u.item.est_kcal,
          est_protein_g: u.item.est_protein_g,
          est_carbs_g: u.item.est_carbs_g,
          est_fat_g: u.item.est_fat_g,
          ...(at ? { logged_at: at } : {}),
        })
        .subscribe({
          next: () => {
            clearPending(u.key);
            toast.success(`${u.key} · ${u.kcal} kcal logged`);
            onLogged();
          },
          error: () => {
            clearPending(u.key);
            toast.error(`Could not log ${u.key}`);
          },
        });
    },
  };
}

export function createLedgerWriters(deps: {
  service: NutritionService;
  toast: ToastService;
  /** Food writes change macros — desktop also re-rolls daily totals here. */
  onFoodChanged: () => void;
  onSupplementsChanged: () => void;
}) {
  const { service, toast, onFoodChanged, onSupplementsChanged } = deps;

  return {
    addFood(draft: TrackerDraft): void {
      const kcal = draft.values['kcal'];
      const estimating = kcal == null;
      // The LLM estimate adds ~1–2s before the entry appears — acknowledge the add.
      if (estimating) toast.info(`Estimating “${draft.label}”…`);
      service
        .createFood({
          raw_text: draft.label,
          logged_at: draft.at,
          est_kcal: kcal ?? null,
          estimate: estimating,
        })
        .subscribe({
          next: () => onFoodChanged(),
          error: () => toast.error('Could not add entry'),
        });
    },

    addSupplement(draft: TrackerDraft): void {
      if (!draft.ref) return;
      service
        .createSupplement({ supplement_id: draft.ref, dosage: draft.values['dose'] || 1, taken_at: draft.at })
        .subscribe({
          next: () => onSupplementsChanged(),
          error: () => toast.error('Could not log supplement'),
        });
    },

    patch(p: TrackerPatch): void {
      const { kind, id } = splitId(p.id);
      if (kind === 'food') {
        service.patchFood(id, foodChanges(p.changes)).subscribe({
          next: () => onFoodChanged(),
          error: () => toast.error('Could not save edit'),
        });
      } else {
        service.patchSupplement(Number(id), suppChanges(p.changes)).subscribe({
          next: () => onSupplementsChanged(),
          error: () => toast.error('Could not save edit'),
        });
      }
    },

    remove(entryId: string): void {
      const { kind, id } = splitId(entryId);
      if (kind === 'food') {
        service.deleteFood(id).subscribe({
          next: () => onFoodChanged(),
          error: () => toast.error('Could not delete entry'),
        });
      } else {
        service.deleteSupplement(Number(id)).subscribe({
          next: () => onSupplementsChanged(),
          error: () => toast.error('Could not delete entry'),
        });
      }
    },
  };
}
