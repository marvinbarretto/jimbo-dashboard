import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiBarChart } from '@shared/components/ui-bar-chart/ui-bar-chart';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import { UiPeriodTotals } from '@shared/components/ui-period-totals/ui-period-totals';
import { UiTrackerDayGroup } from '@shared/components/ui-tracker-day-group/ui-tracker-day-group';
import { UiQuickAddRow, type QuickAddOption } from '@shared/components/ui-quick-add-row/ui-quick-add-row';
import {
  type TrackerDailyTotal,
  type TrackerDraft,
  type TrackerEntry,
  type TrackerMeasure,
  type TrackerPatch,
} from '@shared/components/tracker/tracker.types';
import { ToastService } from '@shared/components/toast/toast.service';
import { londonDay, londonToday, shiftIsoDay } from '@shared/utils/datetime.utils';
import {
  NutritionService,
  type FoodDailyRow,
  type FoodLogEntry,
  type FoodPatch,
  type FrequentFood,
  type SupplementLogEntry,
  type SupplementPatch,
} from '../../data-access/nutrition.service';

// How many days of entries the ledger holds, and the wider window the period
// totals / trend roll up over.
const LEDGER_DAYS = 14;
const DAILY_WINDOW = 90;

// Daily targets, used by the period meters. Tunable; could move to settings.
const TARGETS: Readonly<Record<string, number>> = { kcal: 2200, protein_g: 150 };

// Headline measures for totals + trend (macros only — dose units don't sum).
const TOTALS_MEASURES: readonly TrackerMeasure[] = [
  { key: 'kcal', label: 'Calories', unit: 'kcal', primary: true },
  { key: 'protein_g', label: 'Protein', unit: 'g' },
  { key: 'carbs_g', label: 'Carbs', unit: 'g' },
  { key: 'fat_g', label: 'Fat', unit: 'g' },
];

// Ledger rows: macros + a generic `dose` (supplements carry their own unit).
const LEDGER_MEASURES: readonly TrackerMeasure[] = [
  { key: 'kcal', label: 'calories', unit: 'kcal', primary: true },
  { key: 'protein_g', label: 'protein', unit: 'p' },
  { key: 'carbs_g', label: 'carbs', unit: 'c' },
  { key: 'fat_g', label: 'fat', unit: 'f' },
  { key: 'dose', label: 'dose' },
];

// Quick capture keeps it to a fast headline number; refine the rest inline.
const FOOD_QUICK_ADD: readonly TrackerMeasure[] = [{ key: 'kcal', label: 'kcal', unit: 'kcal' }];
const SUPP_QUICK_ADD: readonly TrackerMeasure[] = [{ key: 'dose', label: 'dose' }];

@Component({
  selector: 'app-nutrition-page',
  imports: [
    UiStack,
    UiSection,
    UiBarChart,
    UiEmptyState,
    UiLoadingState,
    UiPeriodTotals,
    UiTrackerDayGroup,
    UiQuickAddRow,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './nutrition-page.html',
  styleUrl: './nutrition-page.scss',
})
export class NutritionPage {
  private readonly service = inject(NutritionService);
  private readonly toast = inject(ToastService);

  protected readonly ledgerMeasures = LEDGER_MEASURES;
  protected readonly totalsMeasures = TOTALS_MEASURES;
  protected readonly targets = TARGETS;
  protected readonly foodQuickAdd = FOOD_QUICK_ADD;
  protected readonly suppQuickAdd = SUPP_QUICK_ADD;

  // ── Reads (signal-native; reloaded explicitly after each write) ──
  private readonly dailyRes = httpResource<{ days: FoodDailyRow[] }>(
    () => `/api/coach/food-log/daily?days=${DAILY_WINDOW}`,
  );
  private readonly foodRes = httpResource<{ items: FoodLogEntry[] }>(
    () => `/api/coach/food-log?days=${LEDGER_DAYS}&limit=500`,
  );
  private readonly suppRes = httpResource<{ items: SupplementLogEntry[] }>(
    () => `/api/coach/supplement-log?days=${LEDGER_DAYS}&limit=500`,
  );
  private readonly catalogRes = httpResource<{ items: { id: string; name: string }[] }>(
    () => `/api/coach/protocol`,
  );
  private readonly frequentRes = httpResource<{ items: FrequentFood[] }>(
    () => `/api/coach/food-log/frequent?limit=40`,
  );

  // Spinner only on the FIRST load — reload-after-write keeps hasValue() true so
  // the ledger isn't torn down (otherwise every edit would collapse the day groups).
  protected readonly loading = computed(() => this.foodRes.isLoading() && !this.foodRes.hasValue());

  private readonly dailyRows = computed<FoodDailyRow[]>(() => this.dailyRes.value()?.days ?? []);
  private readonly foodEntries = computed<FoodLogEntry[]>(() => this.foodRes.value()?.items ?? []);
  private readonly supplements = computed<SupplementLogEntry[]>(() => this.suppRes.value()?.items ?? []);

  protected readonly foodSuggestions = computed<string[]>(() =>
    (this.frequentRes.value()?.items ?? []).map((f) => f.label),
  );

  protected readonly supplementOptions = computed<QuickAddOption[]>(() =>
    (this.catalogRes.value()?.items ?? []).map((s) => ({ id: s.id, label: s.name })),
  );

  // ── Period totals + trend ────────────────────────────────────────
  protected readonly dailyTotals = computed<TrackerDailyTotal[]>(() =>
    this.dailyRows().map((d) => ({
      date: d.date,
      count: d.count,
      values: { kcal: d.kcal, protein_g: d.protein_g, carbs_g: d.carbs_g, fat_g: d.fat_g },
    })),
  );

  // Continuous LEDGER_DAYS axis (London), filling the zero days the API omits.
  private readonly axis = computed(() => {
    const byDate = new Map(this.dailyRows().map((d) => [d.date, d.kcal]));
    const today = londonToday();
    const out: { date: string; kcal: number }[] = [];
    for (let i = LEDGER_DAYS - 1; i >= 0; i--) {
      const date = shiftIsoDay(today, -i);
      out.push({ date, kcal: byDate.get(date) ?? 0 });
    }
    return out;
  });

  protected readonly trendLabels = computed(() => this.axis().map((d) => d.date.slice(5)));
  protected readonly trendValues = computed(() => this.axis().map((d) => d.kcal));
  protected readonly hasTrend = computed(() => this.dailyRows().some((d) => d.count > 0));

  // ── Unified day ledger (food + supplements interleaved) ──────────
  protected readonly days = computed<{ date: string; entries: TrackerEntry[] }[]>(() => {
    const groups = new Map<string, TrackerEntry[]>();
    const push = (day: string, e: TrackerEntry) => {
      const arr = groups.get(day) ?? [];
      arr.push(e);
      groups.set(day, arr);
    };

    for (const f of this.foodEntries()) push(londonDay(f.logged_at), foodToEntry(f));
    for (const s of this.supplements()) push(londonDay(s.taken_at), suppToEntry(s));

    const today = londonToday();
    if (!groups.has(today)) groups.set(today, []); // always show today for capture

    for (const arr of groups.values()) arr.sort((a, b) => b.at.localeCompare(a.at));

    return [...groups.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, entries]) => ({ date, entries }));
  });

  protected readonly today = londonToday();

  // ── Write handlers (reload-on-write) ─────────────────────────────
  protected onAddFood(draft: TrackerDraft): void {
    const kcal = draft.values['kcal'];
    const estimating = kcal == null;
    // The LLM estimate adds ~1–2s before the entry appears — acknowledge the add.
    if (estimating) this.toast.info(`Estimating “${draft.label}”…`);
    this.service
      .createFood({
        raw_text: draft.label,
        logged_at: draft.at,
        est_kcal: kcal ?? null,
        estimate: estimating,
      })
      .subscribe({
        next: () => this.reloadFood(),
        error: () => this.toast.error('Could not add entry'),
      });
  }

  protected onAddSupplement(draft: TrackerDraft): void {
    if (!draft.ref) return;
    this.service
      .createSupplement({ supplement_id: draft.ref, dosage: draft.values['dose'] || 1, taken_at: draft.at })
      .subscribe({
        next: () => this.suppRes.reload(),
        error: () => this.toast.error('Could not log supplement'),
      });
  }

  protected onPatch(p: TrackerPatch): void {
    const { kind, id } = splitId(p.id);
    if (kind === 'food') {
      this.service.patchFood(id, foodChanges(p.changes)).subscribe({
        next: () => this.reloadFood(),
        error: () => this.toast.error('Could not save edit'),
      });
    } else {
      this.service.patchSupplement(Number(id), suppChanges(p.changes)).subscribe({
        next: () => this.suppRes.reload(),
        error: () => this.toast.error('Could not save edit'),
      });
    }
  }

  protected onRemove(entryId: string): void {
    const { kind, id } = splitId(entryId);
    if (kind === 'food') {
      this.service.deleteFood(id).subscribe({
        next: () => this.reloadFood(),
        error: () => this.toast.error('Could not delete entry'),
      });
    } else {
      this.service.deleteSupplement(Number(id)).subscribe({
        next: () => this.suppRes.reload(),
        error: () => this.toast.error('Could not delete entry'),
      });
    }
  }

  // Food writes change macros → re-roll the daily totals + trend too.
  private reloadFood(): void {
    this.foodRes.reload();
    this.dailyRes.reload();
    this.frequentRes.reload(); // a new/edited food may change the suggestions
  }
}

// ── Mapping: domain shapes → generic tracker entries ───────────────

function foodToEntry(f: FoodLogEntry): TrackerEntry {
  return {
    id: `food:${f.id}`,
    at: f.logged_at,
    label: f.raw_text,
    kind: 'food',
    pending: f.est_kcal === null,
    values: { kcal: f.est_kcal, protein_g: f.est_protein_g, carbs_g: f.est_carbs_g, fat_g: f.est_fat_g },
  };
}

function suppToEntry(s: SupplementLogEntry): TrackerEntry {
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

function foodChanges(c: TrackerPatch['changes']): FoodPatch {
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

function suppChanges(c: TrackerPatch['changes']): SupplementPatch {
  const out: SupplementPatch = {};
  if (c.at !== undefined) out.taken_at = c.at;
  const dose = c.values?.['dose'];
  if (typeof dose === 'number') out.dosage = dose;
  return out;
}

function splitId(id: string): { kind: 'food' | 'supp'; id: string } {
  const [kind, ...rest] = id.split(':');
  return { kind: kind === 'supp' ? 'supp' : 'food', id: rest.join(':') };
}
