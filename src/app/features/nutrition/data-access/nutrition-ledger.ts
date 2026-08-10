import {
  type TrackerEntry,
  type TrackerPatch,
} from '@shared/components/tracker/tracker.types';
import {
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
