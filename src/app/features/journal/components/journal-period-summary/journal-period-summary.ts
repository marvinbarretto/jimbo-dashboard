import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, of, switchMap } from 'rxjs';
import { UiBarChart } from '@shared/components/ui-bar-chart/ui-bar-chart';
import { formatMinutes } from '@shared/utils/datetime.utils';
import {
  type DayKey,
  dateFromDayKey,
  daysInMonth,
  daysInWeek,
  formatDayShort,
  shiftDay,
} from '@shared/utils/date-keys';
import type { GymDailyRow } from '../../../exercise/data-access/exercise.service';
import { EXERCISE_READ } from '../../../exercise/data-access/exercise.read';
import type { FoodDailyRow } from '../../../nutrition/data-access/nutrition.service';
import { NUTRITION_READ } from '../../../nutrition/data-access/nutrition.read';
import { JournalDataService, type TelemetryEventLite } from '../../data-access/journal-data.service';
import { heartbeatBursts } from '../../utils/retro-timeline';
import {
  codeEvidenceSpans,
  dailyUnionMinutes,
  focusSpans,
  unionMinutes,
  type SpanMs,
} from '../../utils/work-measure';

/**
 * Overview's week and month drill-in: the per-day trend, and a way into a
 * single day.
 *
 * No longer a summary. The metric rail above now runs at every horizon, so the
 * totals this used to restate are stated once, with their baselines, by the
 * same components the day view uses. What is left is the pair of things a
 * period genuinely adds and a day cannot: shape across its days, and a route
 * back down into one of them.
 *
 * It began as a parallel implementation of the old day summary and drifted
 * into a second copy of Body — protein meters, a macros donut, training
 * volume, all of which Body's own week and month views already render from
 * range endpoints. Those went first; the duplicated totals followed once the
 * endpoint became period-aware.
 *
 * The routine checklist went too, rather than moving to Body. Routine is a
 * daily question — "did I do it today" — and rolling it up to "days hit this
 * week" turns a prompt into a scorecard, which is the opposite of what it is
 * for. Nothing inherited it; it simply is not a period view.
 *
 * Work evidence comes from the shared work bundle the page already loads;
 * agent runs are a range endpoint fetched on window change (not polled — this
 * is a glance, not a live panel). YouTube segments are passed in by the page,
 * which owns the telemetry query.
 */
@Component({
  selector: 'app-journal-period-summary',
  imports: [RouterLink, UiBarChart],
  templateUrl: './journal-period-summary.html',
  styleUrls: ['./journal-period-summary.scss', '../../journal-sections.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JournalPeriodSummary {
  private readonly journal = inject(JournalDataService);
  private readonly exercise = inject(EXERCISE_READ);
  private readonly nutrition = inject(NUTRITION_READ);

  readonly granularity = input.required<'week' | 'month'>();
  readonly key = input.required<string>();
  /** YouTube watch segments for the window — fetched by the owning page. */
  readonly youtubeEvents = input<readonly TelemetryEventLite[]>([]);

  protected readonly days = computed<readonly DayKey[]>(() =>
    this.granularity() === 'week' ? daysInWeek(this.key()) : daysInMonth(this.key()));



  private readonly range = computed(() => {
    const days = this.days();
    return { from: days[0]!, to: days.at(-1)! };
  });


  private readonly window = computed(() => {
    const { from, to } = this.range();
    return {
      since: dateFromDayKey(from).toISOString(),
      until: dateFromDayKey(shiftDay(to, 1)).toISOString(),
    };
  });

  // ── Range feeds ──────────────────────────────────────────────────────────
  // Same rxjs-interop shape as the day summary: the window is read
  // asynchronously inside the pipe, after inputs are bound.
  private readonly range$ = toObservable(this.range);
  private readonly window$ = toObservable(this.window);

  private readonly nutritionDaily = toSignal(
    this.range$.pipe(
      switchMap(({ from, to }) =>
        this.nutrition.daily({ from, to }).pipe(catchError(() => of({ days: [] as FoodDailyRow[] })))),
    ),
    { initialValue: null },
  );


  private readonly gymDaily = toSignal(
    this.range$.pipe(
      switchMap(({ from, to }) =>
        this.exercise.daily({ from, to }).pipe(catchError(() => of({ days: [] as GymDailyRow[] })))),
    ),
    { initialValue: null },
  );



  // ── Work evidence (from the shared bundle the page loads) ────────────────
  // Only trust the bundle when it's the window we're summarising — it briefly
  // holds the previous period while a new one loads.
  private readonly bundle = computed(() => {
    const b = this.journal.work();
    return b && b.granularity === this.granularity() && b.key === this.key() ? b : null;
  });

  private readonly focusSessions = computed(() => this.bundle()?.sessions ?? []);
  // Marvin's interactive sessions only — executor time is the fleet's.
  private readonly ownCodeSessions = computed(() =>
    (this.bundle()?.code_sessions ?? []).filter(s => !s.actor));
  private readonly bursts = computed(() => heartbeatBursts(this.bundle()?.heartbeats ?? []));

  private readonly deskSpans = computed<SpanMs[]>(() => [
    ...focusSpans(this.focusSessions()),
    ...codeEvidenceSpans(this.ownCodeSessions(), this.bursts()),
  ]);

  protected readonly deskMinutes = computed(() => unionMinutes(this.deskSpans()));

  protected readonly deskPerDay = computed(() => dailyUnionMinutes(
    this.deskSpans(),
    this.days().map(d => ({
      startMs: dateFromDayKey(d).getTime(),
      endMs: dateFromDayKey(shiftDay(d, 1)).getTime(),
    })),
  ));







  // ── Per-day routine adherence ────────────────────────────────────────────
  private readonly gymByDay = computed(() => {
    const map = new Map<DayKey, GymDailyRow>();
    for (const row of this.gymDaily()?.days ?? []) map.set(row.date, row);
    return map;
  });

  private readonly foodByDay = computed(() => {
    const map = new Map<DayKey, FoodDailyRow>();
    for (const row of this.nutritionDaily()?.days ?? []) map.set(row.date, row);
    return map;
  });












  // ── Per-day series ───────────────────────────────────────────────────────
  protected readonly dayLabels = computed(() =>
    this.granularity() === 'week'
      ? this.days().map(d => formatDayShort(d))
      : this.days().map(d => d.slice(-2)));




  // Week: clickable day cards. Month: heatmap shaded by desk time.
  protected readonly dayCells = computed(() => {
    const desk = this.deskPerDay();
    const max = Math.max(...desk, 1);
    const food = this.foodByDay();
    const gym = this.gymByDay();
    return this.days().map((d, i) => ({
      key: d,
      label: formatDayShort(d),
      day: d.slice(-2),
      minutes: desk[i] ?? 0,
      protein: Math.round(food.get(d)?.protein_g ?? 0),
      trained: (gym.get(d)?.sessions ?? 0) > 0 || (gym.get(d)?.cardio_count ?? 0) > 0,
      intensity: (desk[i] ?? 0) / max,
    }));
  });

  protected readonly formatMinutes = formatMinutes;
}
