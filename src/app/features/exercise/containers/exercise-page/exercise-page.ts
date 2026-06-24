import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStatCard } from '@shared/components/ui-stat-card/ui-stat-card';
import { UiBarChart } from '@shared/components/ui-bar-chart/ui-bar-chart';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import { catchError, combineLatest, of, switchMap, timer } from 'rxjs';
import { ExerciseService, type GymDailyRow, type SessionDetailed } from '../../data-access/exercise.service';
import { ExerciseSessionCard } from '../../components/exercise-session-card/exercise-session-card';
import { londonDateTime, londonToday, shiftIsoDay } from '../../utils/exercise-format';

const WINDOW_DAYS = 14;

const EMPTY = (date: string): GymDailyRow => ({
  date, sessions: 0, sets: 0, total_reps: 0, volume_kg: 0,
  cardio_count: 0, cardio_duration_s: 0, cardio_distance_km: 0,
});

@Component({
  selector: 'app-exercise-page',
  imports: [UiStack, UiSection, UiStatCard, UiBarChart, UiEmptyState, UiLoadingState, ExerciseSessionCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './exercise-page.html',
  styleUrl: './exercise-page.scss',
})
export class ExercisePage {
  private readonly service = inject(ExerciseService);

  private readonly result = toSignal(
    timer(0, 60_000).pipe(
      switchMap(() =>
        combineLatest({
          daily: this.service.daily({ days: WINDOW_DAYS }).pipe(
            catchError(() => of({ days: [] as GymDailyRow[] })),
          ),
          recent: this.service.listDetailed({ days: WINDOW_DAYS, limit: 50 }).pipe(
            catchError(() => of({ items: [] as SessionDetailed[] })),
          ),
        }),
      ),
    ),
    { initialValue: null },
  );

  readonly loading = computed(() => this.result() === null);
  readonly recent = computed<SessionDetailed[]>(() => this.result()?.recent.items ?? []);
  private readonly dailyRows = computed<GymDailyRow[]>(() => this.result()?.daily.days ?? []);

  private readonly axis = computed<GymDailyRow[]>(() => {
    const byDate = new Map(this.dailyRows().map((d) => [d.date, d]));
    const today = londonToday();
    const out: GymDailyRow[] = [];
    for (let i = WINDOW_DAYS - 1; i >= 0; i--) {
      const date = shiftIsoDay(today, -i);
      out.push(byDate.get(date) ?? EMPTY(date));
    }
    return out;
  });

  readonly dayLabels = computed(() => this.axis().map((d) => d.date.slice(5))); // MM-DD
  readonly volumeByDay = computed(() => this.axis().map((d) => d.volume_kg));
  readonly hasWindowData = computed(() => this.dailyRows().some((d) => d.sessions > 0));

  readonly today = computed<GymDailyRow>(() => this.axis()[this.axis().length - 1]!);
  readonly todayHasData = computed(() => this.today().sessions > 0);
  readonly todayCardioMin = computed(() => Math.round(this.today().cardio_duration_s / 60));

  // Today's sessions, drawn from the detailed feed (London day match).
  readonly todaySessions = computed<SessionDetailed[]>(() => {
    const t = londonToday();
    return this.recent().filter((s) => londonDay(s.started_at) === t);
  });

  readonly todayMeta = computed(() => {
    const n = this.today().sessions;
    return n > 0 ? `${n} ${n === 1 ? 'session' : 'sessions'}` : 'nothing logged';
  });
  readonly windowMeta = computed(() => {
    const active = this.dailyRows().filter((d) => d.sessions > 0).length;
    return `last ${WINDOW_DAYS} days · ${active} active`;
  });
  readonly recentMeta = computed(() => `${this.recent().length} shown`);

  sessionWhen(ts: string): string {
    return londonDateTime(ts);
  }
}

function londonDay(ts: string): string {
  return new Date(ts).toLocaleDateString('en-CA', { timeZone: 'Europe/London' });
}
