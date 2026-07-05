import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiStatCard } from '@shared/components/ui-stat-card/ui-stat-card';
import { UiBarChart } from '@shared/components/ui-bar-chart/ui-bar-chart';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import { logicalDay } from '@shared/utils/datetime.utils';
import { catchError, combineLatest, of, switchMap, timer } from 'rxjs';
import {
  ExerciseService,
  type GymActivityRow,
  type GymDailyRow,
  type SessionDetailed,
} from '../../data-access/exercise.service';
import { sessionStats, shiftIsoDay } from '../../utils/exercise-format';

const EMPTY = (date: string): GymDailyRow => ({
  date, sessions: 0, sets: 0, total_reps: 0, volume_kg: 0,
  cardio_count: 0, cardio_duration_s: 0, cardio_distance_km: 0,
});

// One row of the "by activity" breakdown: how many days the activity happened
// in the period, plus its quantity in the activity's own unit (sets/volume for
// strength, minutes/distance for cardio).
interface ActivityMixRow {
  label: string;
  days: number;
  detail: string;
}

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
        combineLatest({
          workouts: this.service.daily({ from: this.from(), to: this.to() }).pipe(
            catchError(() => of({ days: [] as GymDailyRow[] })),
          ),
          activity: this.service.activityDaily({ from: this.from(), to: this.to() }).pipe(
            catchError(() => of({ days: [] as GymActivityRow[] })),
          ),
          // Detailed sessions carry exercise names — the only feed that can say
          // *what* the activity was (football vs weights), not just how much.
          detailed: this.service.listDetailed({ from: this.from(), to: this.to(), limit: 200 }).pipe(
            catchError(() => of({ items: [] as SessionDetailed[] })),
          ),
        }),
      ),
    ),
    { initialValue: null },
  );

  readonly loading = computed(() => this.result() === null);
  private readonly rows = computed<GymDailyRow[]>(() => this.result()?.workouts.days ?? []);
  private readonly activityRows = computed<GymActivityRow[]>(() => this.result()?.activity.days ?? []);
  private readonly sessions = computed<SessionDetailed[]>(() => this.result()?.detailed.items ?? []);

  readonly activityTotals = computed(() =>
    this.activityRows().reduce(
      (acc, d) => ({
        steps: acc.steps + d.steps,
        distanceKm: Math.round((acc.distanceKm + d.distance_km) * 100) / 100,
      }),
      { steps: 0, distanceKm: 0 },
    ),
  );
  readonly hasActivity = computed(() => this.activityRows().some((d) => d.steps > 0));

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
  readonly hasAny = computed(() => this.hasData() || this.hasActivity());
  readonly open = linkedSignal(() => this.loading() || this.hasAny());

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

  readonly cardioLabel = computed(() => formatDuration(this.totals().cardioMin));

  // "How many days did I do X, and how much" — the per-activity breakdown.
  // Strength work rolls up as one row; each cardio exercise gets its own row
  // named after the exercise (5-a-side football, treadmill run, …). Sessions
  // with nothing logged surface too, so a stray empty session is visible
  // rather than silently inflating the workout count.
  readonly activityMix = computed<ActivityMixRow[]>(() => {
    const strengthDays = new Set<string>();
    let strengthSets = 0;
    let strengthVolume = 0;
    const cardio = new Map<string, { days: Set<string>; min: number; km: number }>();
    const emptyDays = new Set<string>();

    for (const s of this.sessions()) {
      const day = logicalDay(s.started_at);
      const st = sessionStats(s);
      if (s.sets.length > 0) {
        strengthDays.add(day);
        strengthSets += st.sets;
        strengthVolume += st.volumeKg;
      }
      for (const c of s.cardio) {
        const label = c.exercise_name ?? 'Cardio';
        const bucket = cardio.get(label) ?? { days: new Set<string>(), min: 0, km: 0 };
        bucket.days.add(day);
        bucket.min += Math.round((c.duration_s ?? 0) / 60);
        bucket.km += c.distance_km ?? 0;
        cardio.set(label, bucket);
      }
      if (s.sets.length === 0 && s.cardio.length === 0) emptyDays.add(day);
    }

    const rows: ActivityMixRow[] = [];
    if (strengthDays.size > 0) {
      rows.push({
        label: 'Gym (weights)',
        days: strengthDays.size,
        detail: `${strengthSets} sets · ${strengthVolume.toLocaleString()} kg`,
      });
    }
    for (const [label, b] of cardio) {
      const km = Math.round(b.km * 100) / 100;
      rows.push({
        label,
        days: b.days.size,
        detail: formatDuration(b.min) + (km > 0 ? ` · ${km} km` : ''),
      });
    }
    rows.sort((a, b) => b.days - a.days);
    if (emptyDays.size > 0) {
      rows.push({ label: 'Session with nothing logged', days: emptyDays.size, detail: '—' });
    }
    return rows;
  });

  readonly sectionMeta = computed(() => {
    const t = this.totals();
    const parts: string[] = [];
    if (t.sessions > 0) parts.push(`${t.sessions} ${t.sessions === 1 ? 'workout' : 'workouts'}`);
    if (t.cardioMin > 0) parts.push(`${formatDuration(t.cardioMin)} cardio`);
    if (this.activityTotals().steps > 0) parts.push(`${this.activityTotals().steps.toLocaleString()} steps`);
    return parts.join(' · ') || 'no activity';
  });
}

function formatDuration(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
