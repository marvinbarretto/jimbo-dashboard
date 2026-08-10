import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { UiPage } from '@shared/components/ui-page/ui-page';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiBarChart, type BarSeries } from '@shared/components/ui-bar-chart/ui-bar-chart';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import { UiPeriodTotals } from '@shared/components/ui-period-totals/ui-period-totals';
import { type TrackerPeriod } from '@shared/components/ui-period-totals/period-window';
import { UiPeriodPager } from '@shared/components/ui-period-pager/ui-period-pager';
import { UiTrackerDayGroup } from '@shared/components/ui-tracker-day-group/ui-tracker-day-group';
import { UiQuickAddRow, type QuickAddOption } from '@shared/components/ui-quick-add-row/ui-quick-add-row';
import {
  type TrackerDailyTotal,
  type TrackerEntry,
  type TrackerMeasure,
} from '@shared/components/tracker/tracker.types';
import { ToastService } from '@shared/components/toast/toast.service';
import { logicalDay } from '@shared/utils/datetime.utils';
import { createTrackerPageSignals } from '@shared/utils/tracker-page-signals';
import {
  NutritionService,
  type FoodDailyRow,
  type FoodLogEntry,
  type FrequentFood,
  type SupplementLogEntry,
} from '../../data-access/nutrition.service';
import {
  createLedgerWriters,
  foodToEntry,
  isAlcoholicDrink,
  suppToEntry,
} from '../../data-access/nutrition-ledger';

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
    RouterLink,
    UiPage,
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

  protected readonly ledgerMeasures = LEDGER_MEASURES;
  protected readonly totalsMeasures = TOTALS_MEASURES;
  protected readonly targets = TARGETS;
  protected readonly foodQuickAdd = FOOD_QUICK_ADD;
  protected readonly suppQuickAdd = SUPP_QUICK_ADD;

  protected readonly pager = createTrackerPageSignals({
    basePath: 'nutrition',
    route: inject(ActivatedRoute),
    router: inject(Router),
  });

  protected readonly granularity = this.pager.granularity;
  protected readonly todayIso = this.pager.todayIso;

  protected readonly supplementDefaultDate = computed(() =>
    this.granularity === 'day' && this.pager.key() !== this.todayIso ? this.pager.key() : undefined,
  );

  // ── Reads (signal-native; reloaded explicitly after each write) ──
  private readonly dailyRes = httpResource<{ days: FoodDailyRow[] }>(
    () => `/api/coach/food-log/daily?from=${this.pager.window().start}&to=${this.pager.window().end}`,
  );
  private readonly foodRes = httpResource<{ items: FoodLogEntry[] }>(
    () => `/api/coach/food-log?from=${this.pager.window().start}&to=${this.pager.window().end}&limit=500`,
  );
  private readonly suppRes = httpResource<{ items: SupplementLogEntry[] }>(
    () => `/api/coach/supplement-log?from=${this.pager.window().start}&to=${this.pager.window().end}&limit=500`,
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
      const day = logicalDay(f.logged_at);
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
    return this.pager.windowDays().map((date) => ({ date, row: byDate.get(date) ?? null }));
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

    for (const f of this.foodEntries()) push(logicalDay(f.logged_at), foodToEntry(f));
    for (const s of this.supplements()) push(logicalDay(s.taken_at), suppToEntry(s));

    for (const d of this.pager.windowDays()) if (!groups.has(d)) groups.set(d, []);

    for (const arr of groups.values()) arr.sort((a, b) => b.at.localeCompare(a.at));

    return [...groups.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, entries]) => ({ date, entries }));
  });

  // Write side is shared with the phone shell's Log tab — see createLedgerWriters.
  protected readonly ledger = createLedgerWriters({
    service: this.service,
    toast: this.toast,
    // Food writes change macros → re-roll the daily totals + trend too.
    onFoodChanged: () => {
      this.foodRes.reload();
      this.dailyRes.reload();
      this.frequentRes.reload(); // a new/edited food may change the suggestions
    },
    onSupplementsChanged: () => this.suppRes.reload(),
  });
}

