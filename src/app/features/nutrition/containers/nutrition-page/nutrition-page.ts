import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiSubsection } from '@shared/components/ui-subsection/ui-subsection';
import { UiStatCard } from '@shared/components/ui-stat-card/ui-stat-card';
import { UiBarChart } from '@shared/components/ui-bar-chart/ui-bar-chart';
import { UiDonutChart } from '@shared/components/ui-donut-chart/ui-donut-chart';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import { catchError, combineLatest, of, switchMap, timer } from 'rxjs';
import { NutritionService, type FoodDailyRow, type FoodLogEntry } from '../../data-access/nutrition.service';

const WINDOW_DAYS = 14;

@Component({
  selector: 'app-nutrition-page',
  imports: [
    UiStack,
    UiSection,
    UiSubsection,
    UiStatCard,
    UiBarChart,
    UiDonutChart,
    UiEmptyState,
    UiLoadingState,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './nutrition-page.html',
  styleUrl: './nutrition-page.scss',
})
export class NutritionPage {
  private readonly service = inject(NutritionService);

  protected readonly macroLabels: readonly string[] = ['Protein', 'Carbs', 'Fat'];

  private readonly result = toSignal(
    timer(0, 60_000).pipe(
      switchMap(() =>
        combineLatest({
          daily: this.service.daily({ days: WINDOW_DAYS }).pipe(
            catchError(() => of({ days: [] as FoodDailyRow[] })),
          ),
          recent: this.service.list({ limit: 25 }).pipe(
            catchError(() => of({ items: [] as FoodLogEntry[] })),
          ),
        }),
      ),
    ),
    { initialValue: null },
  );

  readonly loading = computed(() => this.result() === null);
  readonly recent = computed<FoodLogEntry[]>(() => this.result()?.recent.items ?? []);
  private readonly dailyRows = computed<FoodDailyRow[]>(() => this.result()?.daily.days ?? []);

  // Continuous last-N-day axis (London), filling the zero days the API omits
  // so the bar chart shows an unbroken timeline.
  private readonly axis = computed<FoodDailyRow[]>(() => {
    const byDate = new Map(this.dailyRows().map((d) => [d.date, d]));
    const today = londonToday();
    const out: FoodDailyRow[] = [];
    for (let i = WINDOW_DAYS - 1; i >= 0; i--) {
      const date = shiftIsoDay(today, -i);
      out.push(byDate.get(date) ?? { date, kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, count: 0 });
    }
    return out;
  });

  readonly dayLabels = computed(() => this.axis().map((d) => d.date.slice(5))); // MM-DD
  readonly caloriesByDay = computed(() => this.axis().map((d) => d.kcal));
  readonly hasWindowData = computed(() => this.dailyRows().some((d) => d.count > 0));

  readonly today = computed<FoodDailyRow>(() => this.axis()[this.axis().length - 1]!);
  readonly todayHasData = computed(() => this.today().count > 0);
  readonly macroValues = computed(() => {
    const t = this.today();
    return [t.protein_g, t.carbs_g, t.fat_g];
  });

  // Mean kcal across days that actually had entries (ignores blanks).
  private readonly avgKcal = computed(() => {
    const withData = this.dailyRows().filter((d) => d.count > 0);
    if (!withData.length) return 0;
    return Math.round(withData.reduce((s, d) => s + d.kcal, 0) / withData.length);
  });

  readonly todayMeta = computed(() => {
    const t = this.today();
    return t.count > 0 ? `${t.count} ${t.count === 1 ? 'entry' : 'entries'}` : 'nothing logged';
  });
  readonly windowMeta = computed(() => `last ${WINDOW_DAYS} days · avg ${this.avgKcal()} kcal/day`);
  readonly recentMeta = computed(() => `${this.recent().length} shown`);

  formatTime(ts: string): string {
    return new Date(ts).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/London',
    });
  }
}

function londonToday(): string {
  // en-CA renders as YYYY-MM-DD.
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
}

// Shift a YYYY-MM-DD day by whole days. Parsed as UTC midnight and shifted in
// UTC so there's no DST drift on the date arithmetic itself.
function shiftIsoDay(iso: string, deltaDays: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}
