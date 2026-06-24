import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiStatCard } from '@shared/components/ui-stat-card/ui-stat-card';
import { UiBarChart } from '@shared/components/ui-bar-chart/ui-bar-chart';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import { catchError, of, switchMap, timer } from 'rxjs';
import { ExerciseService, type GymDailyRow } from '../../data-access/exercise.service';
import { shiftIsoDay } from '../../utils/exercise-format';

const EMPTY = (date: string): GymDailyRow => ({
  date, sessions: 0, sets: 0, total_reps: 0, volume_kg: 0,
  cardio_count: 0, cardio_duration_s: 0, cardio_distance_km: 0,
});

// Rollup summary for a date range (London days). Used on the journal week and
// month pages, which can navigate to past periods — hence from/to rather than a
// trailing window.
@Component({
  selector: 'app-exercise-summary-section',
  imports: [UiSection, UiStack, UiStatCard, UiBarChart, UiEmptyState, UiLoadingState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './exercise-summary-section.html',
  styleUrl: './exercise-summary-section.scss',
})
export class ExerciseSummarySection {
  private readonly service = inject(ExerciseService);

  readonly from = input.required<string>(); // YYYY-MM-DD inclusive
  readonly to = input.required<string>();    // YYYY-MM-DD inclusive

  private readonly result = toSignal(
    timer(0, 60_000).pipe(
      switchMap(() =>
        this.service.daily({ from: this.from(), to: this.to() }).pipe(
          catchError(() => of({ days: [] as GymDailyRow[] })),
        ),
      ),
    ),
    { initialValue: null },
  );

  readonly loading = computed(() => this.result() === null);
  private readonly rows = computed<GymDailyRow[]>(() => this.result()?.days ?? []);

  // Continuous day axis across the range, filling the zero days the API omits.
  private readonly axis = computed<GymDailyRow[]>(() => {
    const byDate = new Map(this.rows().map((d) => [d.date, d]));
    const out: GymDailyRow[] = [];
    const end = this.to();
    let cur = this.from();
    // Guard against an inverted range; cap at 366 to avoid a runaway loop.
    for (let i = 0; i < 366 && cur <= end; i++) {
      out.push(byDate.get(cur) ?? EMPTY(cur));
      cur = shiftIsoDay(cur, 1);
    }
    return out;
  });

  readonly hasData = computed(() => this.rows().some((d) => d.sessions > 0));
  readonly open = linkedSignal(() => this.loading() || this.hasData());

  readonly dayLabels = computed(() => this.axis().map((d) => d.date.slice(5))); // MM-DD
  readonly volumeByDay = computed(() => this.axis().map((d) => d.volume_kg));

  readonly totals = computed(() =>
    this.rows().reduce(
      (acc, d) => ({
        sessions: acc.sessions + d.sessions,
        sets: acc.sets + d.sets,
        volumeKg: acc.volumeKg + d.volume_kg,
        cardioMin: acc.cardioMin + Math.round(d.cardio_duration_s / 60),
        cardioKm: Math.round((acc.cardioKm + d.cardio_distance_km) * 100) / 100,
      }),
      { sessions: 0, sets: 0, volumeKg: 0, cardioMin: 0, cardioKm: 0 },
    ),
  );

  readonly sectionMeta = computed(() => {
    const t = this.totals();
    if (t.sessions === 0) return 'no sessions';
    return `${t.sessions} ${t.sessions === 1 ? 'session' : 'sessions'} · ${t.volumeKg} kg`;
  });
}
