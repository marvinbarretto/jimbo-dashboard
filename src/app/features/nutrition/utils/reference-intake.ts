/**
 * UK reference intakes, and how to phrase a scanned portion against them.
 *
 * These are the same figures printed on the front of the pack Marvin is holding
 * when he scans it — deliberately, so "18% of your salt for the day" on screen
 * agrees with the label in his hand rather than quietly using a different
 * denominator. They are adult population averages, not his personal targets;
 * the day/week views use his own kcal and protein goals for that.
 *
 * Fibre is the exception: it isn't on the standard front-of-pack label, so this
 * uses the NHS recommendation of 30g/day.
 */
export interface ReferenceIntake {
  readonly key: string;
  readonly label: string;
  readonly daily: number;
  readonly unit: string;
  /**
   * 'limit'  — less is better; a big share is a warning (salt, saturates, sugar)
   * 'target' — more is better; a big share is a win (fibre, protein)
   *
   * This decides whether a full meter reads as good or bad, so it must be set
   * per nutrient rather than inferred from the number.
   */
  readonly direction: 'limit' | 'target';
}

export const REFERENCE_INTAKES: Readonly<Record<string, ReferenceIntake>> = {
  sat_fat_g: { key: 'sat_fat_g', label: 'Saturates', daily: 20, unit: 'g', direction: 'limit' },
  sugars_g: { key: 'sugars_g', label: 'Sugars', daily: 90, unit: 'g', direction: 'limit' },
  salt_g: { key: 'salt_g', label: 'Salt', daily: 6, unit: 'g', direction: 'limit' },
  fiber_g: { key: 'fiber_g', label: 'Fibre', daily: 30, unit: 'g', direction: 'target' },
};

/** Share of the daily reference this portion uses, 0–1 and uncapped above 1. */
export function shareOfDaily(key: string, grams: number | null | undefined): number | null {
  const ref = REFERENCE_INTAKES[key];
  if (!ref || grams == null) return null;
  return grams / ref.daily;
}

/**
 * How loudly to render a nutrient.
 *
 * Thresholds follow the spirit of front-of-pack traffic lights — a portion
 * carrying a third of a day's limit is worth flagging, half is worth shouting
 * about — rather than inventing a scale. Nutrients we want MORE of never turn
 * red: failing to hit fibre in one product is not an error.
 */
export function intakeStatus(
  key: string,
  grams: number | null | undefined,
): 'neutral' | 'warn' | 'alert' {
  const ref = REFERENCE_INTAKES[key];
  const share = shareOfDaily(key, grams);
  if (!ref || share == null) return 'neutral';
  if (ref.direction === 'target') return 'neutral';
  if (share >= 0.5) return 'alert';
  if (share >= 0.3) return 'warn';
  return 'neutral';
}

/**
 * Percent of the daily reference, rounded, for display.
 * Returns null when the nutrient wasn't measured — callers must render that as
 * "not measured" rather than 0%.
 */
export function percentOfDaily(key: string, grams: number | null | undefined): number | null {
  const share = shareOfDaily(key, grams);
  return share == null ? null : Math.round(share * 100);
}

/**
 * The percentage as a phrase.
 *
 * A measured trace rounds to "<1%" rather than "0%": 0.3g of sugar against a
 * 90g reference really is negligible, but printing a flat 0 next to a non-zero
 * gram figure reads as a contradiction, and this screen's whole claim is that
 * nothing measured is ever shown as nothing.
 */
export function percentOfDailyLabel(key: string, grams: number | null | undefined): string | null {
  const share = shareOfDaily(key, grams);
  if (share == null) return null;
  if (share > 0 && share < 0.005) return '<1% of a day';
  return `${Math.round(share * 100)}% of a day`;
}

/**
 * Plain-English portion basis, for the line under the amount.
 *
 * 'default_100g' gets the only cautionary wording on the screen: it's the case
 * where nobody — not the manufacturer, not us — actually knows the portion, and
 * the number above it is a per-100g figure wearing a serving's clothes.
 */
export function portionBasisLabel(
  source: string,
  unit: string,
  packSize: number | null,
): string {
  switch (source) {
    case 'serving_size':
      return 'one manufacturer serving';
    case 'pack':
      return packSize != null ? `the whole ${packSize}${unit} pack` : 'the whole pack';
    case 'servings':
      return 'your chosen servings';
    case 'grams':
      return `your chosen amount`;
    case 'default_100g':
      return `assumed 100${unit} — no serving size on record, check the pack`;
    default:
      return '';
  }
}
