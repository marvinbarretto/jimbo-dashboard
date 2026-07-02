import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiBarChart, type BarSeries } from '@shared/components/ui-bar-chart/ui-bar-chart';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import { UiPeriodTotals } from '@shared/components/ui-period-totals/ui-period-totals';
import { periodWindow, type TrackerPeriod } from '@shared/components/ui-period-totals/period-window';
import { UiPeriodPager } from '@shared/components/ui-period-pager/ui-period-pager';
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
  type DayKey,
  type MonthKey,
  type WeekKey,
  dayKeyFromDate,
  isDayKey,
  isMonthKey,
  isWeekKey,
  monthRange,
  shiftDay,
  shiftMonth,
  shiftWeek,
  thisMonthKey,
  thisWeekKey,
  todayKey,
  weekStartFromKey,
} from '@shared/utils/date-keys';
import {
  NutritionService,
  type FoodDailyRow,
  type FoodItem,
  type FoodLogEntry,
  type FoodPatch,
  type FrequentFood,
  type SupplementLogEntry,
  type SupplementPatch,
} from '../../data-access/nutrition.service';

// Daily targets, used by the period meters. Tunable; could move to settings.
const TARGETS: Readonly<Record<string, number>> = { kcal: 2200, protein_g: 150 };

// Headline measures for totals + trend (macros only — dose units don't sum).
// `alcohol_kcal` renders as a share of total calories — the empty-calorie load
// the user is trying to cut (see alcoholByDay + isAlcoholicDrink below).
const TOTALS_MEASURES: readonly TrackerMeasure[] = [
  { key: 'kcal', label: 'Calories', unit: 'kcal', primary: true },
  { key: 'alcohol_kcal', label: 'Alcohol', unit: 'kcal', share: { of: 'kcal' } },
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
    UiPeriodPager,
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
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly ledgerMeasures = LEDGER_MEASURES;
  protected readonly totalsMeasures = TOTALS_MEASURES;
  protected readonly targets = TARGETS;
  protected readonly foodQuickAdd = FOOD_QUICK_ADD;
  protected readonly suppQuickAdd = SUPP_QUICK_ADD;

  // Granularity is fixed per route config (day/:date vs week/:week vs
  // month/:month) — a real change of granularity always navigates to a
  // different route, which Angular tears down and recreates, so a
  // constructor-time read is safe (never goes stale within one instance).
  protected readonly granularity = this.route.snapshot.data['granularity'] as TrackerPeriod;

  protected readonly todayIso = londonToday();

  // The raw route key, in the format the route param uses (DayKey / WeekKey /
  // MonthKey) — what previous/next/today navigate with.
  protected readonly key = toSignal(
    this.route.paramMap.pipe(map((p) => sanitiseKey(this.granularity, p))),
    { initialValue: defaultKey(this.granularity) },
  );

  // The same period, expressed as a plain anchor date (YYYY-MM-DD) for the
  // date-arithmetic-only `periodWindow`.
  private readonly anchorIso = computed(() => anchorIsoOf(this.granularity, this.key()));

  protected readonly window = computed(() => periodWindow(this.granularity, this.anchorIso(), this.todayIso));
  protected readonly isAtToday = computed(() => {
    const w = this.window();
    return w.start <= this.todayIso && this.todayIso <= w.end;
  });

  private readonly windowDays = computed<string[]>(() => {
    const { start, end } = this.window();
    const out: string[] = [];
    let cur = start;
    for (let i = 0; i < 31 && cur <= end; i++) {
      out.push(cur);
      cur = shiftIsoDay(cur, 1);
    }
    return out;
  });

  // Trend is a multi-day pattern view — on a single day it'd just restate the
  // ledger below, so it stays week/month-only (see ExercisePage for the same
  // treatment).
  protected readonly showPatterns = computed(() => this.granularity !== 'day');

  // ── Reads (signal-native; reloaded explicitly after each write) ──
  private readonly dailyRes = httpResource<{ days: FoodDailyRow[] }>(
    () => `/api/coach/food-log/daily?from=${this.window().start}&to=${this.window().end}`,
  );
  private readonly foodRes = httpResource<{ items: FoodLogEntry[] }>(
    () => `/api/coach/food-log?from=${this.window().start}&to=${this.window().end}&limit=500`,
  );
  private readonly suppRes = httpResource<{ items: SupplementLogEntry[] }>(
    () => `/api/coach/supplement-log?from=${this.window().start}&to=${this.window().end}&limit=500`,
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

  // Whole-drink alcohol calories per London day, from the per-item food log.
  // A drink is "alcoholic" when its calories exceed what its macros explain (the
  // Atwater residual flags ethanol — Coke/juice/coffee read ~0, beer/wine large);
  // we then count the WHOLE drink, since beer's sugar is just as empty as the
  // alcohol for a fat-loss goal. foodEntries is scoped to the exact same window
  // as everything else on the page, so this always covers the full displayed period.
  private readonly alcoholByDay = computed<Map<string, number>>(() => {
    const map = new Map<string, number>();
    for (const f of this.foodEntries()) {
      const day = londonDay(f.logged_at);
      for (const it of f.items) {
        if (isAlcoholicDrink(it)) map.set(day, (map.get(day) ?? 0) + it.kcal);
      }
    }
    return map;
  });

  // ── Period totals + trend ────────────────────────────────────────
  protected readonly dailyTotals = computed<TrackerDailyTotal[]>(() => {
    const alcByDay = this.alcoholByDay();
    return this.dailyRows().map((d) => ({
      date: d.date,
      count: d.count,
      values: {
        kcal: d.kcal,
        alcohol_kcal: Math.min(d.kcal, alcByDay.get(d.date) ?? 0),
        protein_g: d.protein_g,
        carbs_g: d.carbs_g,
        fat_g: d.fat_g,
      },
    }));
  });

  // Continuous day axis across the window, filling the zero days the API omits.
  private readonly axis = computed(() => {
    const byDate = new Map(this.dailyRows().map((d) => [d.date, d]));
    return this.windowDays().map((date) => ({ date, row: byDate.get(date) ?? null }));
  });

  protected readonly trendLabels = computed(() => this.axis().map((d) => d.date.slice(5)));
  protected readonly hasTrend = computed(() => this.dailyRows().some((d) => d.count > 0));

  // Alcohol is listed first so it stacks on the BOTTOM — a fixed baseline makes
  // the "empty calories" segment directly comparable day-to-day (the metric the
  // user is trying to cut). It also carries the louder colour; food is muted.
  protected readonly trendSeries = computed<BarSeries[]>(() => {
    const alcByDay = this.alcoholByDay();
    const food: number[] = [];
    const alcohol: number[] = [];
    for (const { date, row } of this.axis()) {
      const kcal = row?.kcal ?? 0;
      const alc = Math.min(kcal, alcByDay.get(date) ?? 0); // never exceed the day's total
      alcohol.push(alc);
      food.push(Math.max(0, kcal - alc));
    }
    return [
      { label: 'Alcohol', values: alcohol, accent: 'rgba(244, 114, 71, 0.9)' },
      { label: 'Food', values: food, accent: 'rgba(100, 116, 139, 0.55)' },
    ];
  });

  // ── Unified day ledger (food + supplements interleaved) ──────────
  // Seeded with every day in the window (not just days with entries) so a
  // week/month view shows quiet days too, matching the exercise ledger.
  protected readonly days = computed<{ date: string; entries: TrackerEntry[] }[]>(() => {
    const groups = new Map<string, TrackerEntry[]>();
    const push = (day: string, e: TrackerEntry) => {
      const arr = groups.get(day) ?? [];
      arr.push(e);
      groups.set(day, arr);
    };

    for (const f of this.foodEntries()) push(londonDay(f.logged_at), foodToEntry(f));
    for (const s of this.supplements()) push(londonDay(s.taken_at), suppToEntry(s));

    for (const d of this.windowDays()) if (!groups.has(d)) groups.set(d, []);

    for (const arr of groups.values()) arr.sort((a, b) => b.at.localeCompare(a.at));

    return [...groups.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, entries]) => ({ date, entries }));
  });

  // ── Pager navigation ──────────────────────────────────────────────
  protected previous(): void {
    this.navigateTo(shiftKey(this.granularity, this.key(), -1));
  }
  protected next(): void {
    this.navigateTo(shiftKey(this.granularity, this.key(), 1));
  }
  protected today(): void {
    this.navigateTo(defaultKey(this.granularity));
  }
  protected onDateChange(value: string): void {
    if (isValidKey(this.granularity, value)) this.navigateTo(value);
  }
  private navigateTo(key: string): void {
    this.router.navigate(['/nutrition', this.granularity, key]);
  }

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

// Whether a drink counts as alcohol (we then count its whole kcal). Hybrid:
// trust the LLM's `alcoholic` flag when present — it read the name at ingest and
// correctly handles 0.0%/alcohol-free drinks a heuristic would misjudge. Fall
// back to the Atwater residual (kcal − 4·P − 4·C − 9·F isolates ethanol) only for
// older/manual entries that predate the flag; soft drinks sit near 0, beer/wine
// clear the margin comfortably.
const ALCOHOL_RESIDUAL_MIN = 30;
function isAlcoholicDrink(it: FoodItem): boolean {
  if (it.kind !== 'drink') return false;
  if (typeof it.alcoholic === 'boolean') return it.alcoholic;
  const macroKcal = 4 * it.protein_g + 4 * it.carbs_g + 9 * it.fat_g;
  return it.kcal - macroKcal > ALCOHOL_RESIDUAL_MIN;
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

// ── Route key ↔ period-window plumbing ──────────────────────────────
// The route param format (DayKey / WeekKey / MonthKey) is what previous/next/
// today navigate with; `periodWindow` wants a plain anchor date. These bridge
// the two per granularity. (Mirrors ExercisePage.)

function sanitiseKey(granularity: TrackerPeriod, params: { get(name: string): string | null }): string {
  if (granularity === 'day') { const v = params.get('date'); return isDayKey(v) ? v : todayKey(); }
  if (granularity === 'week') { const v = params.get('week'); return isWeekKey(v) ? v : thisWeekKey(); }
  const v = params.get('month');
  return isMonthKey(v) ? v : thisMonthKey();
}

function defaultKey(granularity: TrackerPeriod): string {
  if (granularity === 'day') return todayKey();
  if (granularity === 'week') return thisWeekKey();
  return thisMonthKey();
}

function isValidKey(granularity: TrackerPeriod, value: string): boolean {
  if (granularity === 'day') return isDayKey(value);
  if (granularity === 'week') return isWeekKey(value);
  return isMonthKey(value);
}

function shiftKey(granularity: TrackerPeriod, key: string, delta: number): string {
  if (granularity === 'day') return shiftDay(key as DayKey, delta);
  if (granularity === 'week') return shiftWeek(key as WeekKey, delta);
  return shiftMonth(key as MonthKey, delta);
}

function anchorIsoOf(granularity: TrackerPeriod, key: string): string {
  if (granularity === 'day') return key;
  if (granularity === 'week') return dayKeyFromDate(weekStartFromKey(key as WeekKey));
  return dayKeyFromDate(monthRange(key as MonthKey).start);
}
