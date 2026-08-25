import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, of, switchMap } from 'rxjs';
import { UiChecklist, type UiChecklistItem } from '@shared/components/ui-checklist/ui-checklist';
import { UiDonutChart } from '@shared/components/ui-donut-chart/ui-donut-chart';
import { UiProgressMeter } from '@shared/components/ui-progress-meter/ui-progress-meter';
import { formatMinutes } from '@shared/utils/datetime.utils';
import type { SessionDetailed, GymDailyRow } from '../../../exercise/data-access/exercise.service';
import { EXERCISE_READ } from '../../../exercise/data-access/exercise.read';
import { sessionStats } from '../../../exercise/utils/exercise-format';
import type { FoodLogEntry, SupplementLogEntry, FoodDailyRow } from '../../../nutrition/data-access/nutrition.service';
import { NUTRITION_READ } from '../../../nutrition/data-access/nutrition.read';
import { JournalDataService } from '../../data-access/journal-data.service';
import {
  dateFromDayKey,
  weekKeyFromDate,
  daysInWeek,
  shiftDay,
  todayKey,
  type DayKey,
} from '@shared/utils/date-keys';

// Daily protein target — mirrors nutrition-page.ts (no shared settings source yet).
const PROTEIN_TARGET_G = 150;

// The daily things we expect to do, each measured against a target and ticked
// from real logged data. Adding a row is a one-liner: give it a label, a target,
// and how to count progress from the snapshot. Tune the targets here.
interface RoutineSnapshot {
  readonly exercise: number;
  readonly supplements: number;
  readonly projects: number;
  readonly food: number;
}

const ROUTINE: readonly {
  readonly label: string;
  readonly target: number;
  readonly current: (s: RoutineSnapshot) => number;
}[] = [
  { label: 'Move / exercise', target: 1, current: s => s.exercise },
  { label: 'Supplements', target: 3, current: s => s.supplements },
  { label: 'Work across projects', target: 2, current: s => s.projects },
  { label: 'Eat something', target: 1, current: s => s.food },
];

/**
 * Daily routine adherence, plus the magnitudes behind it: protein against
 * target, training volume, macro split.
 *
 * Lives on the Body domain. It began as the journal Overview's header, which
 * gave half of a work-first glance page to protein meters; Overview now leads
 * with work metrics and this went where it was always about.
 *
 * The routine checklist and the meters answer different questions on purpose —
 * "did I do it" versus "how much" — because a count-against-target bar
 * flattens both and loses the grams.
 *
 * Fetches its feeds on date change rather than polling: a glance, not a live
 * panel.
 */
@Component({
  selector: 'app-journal-routine-fuel-section',
  imports: [UiChecklist, UiDonutChart, UiProgressMeter],
  templateUrl: './journal-routine-fuel-section.html',
  styleUrl: './journal-routine-fuel-section.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JournalRoutineFuelSection {
  private readonly journal = inject(JournalDataService);
  private readonly exercise = inject(EXERCISE_READ);
  private readonly nutrition = inject(NUTRITION_READ);

  readonly date = input.required<DayKey>();

  // Only trust the shared work bundle when it's the day we're summarising — it
  // can briefly hold the previous day while a new one loads.
  private readonly bundle = computed(() => {
    const b = this.journal.day();
    return b && b.date === this.date() ? b : null;
  });

  // ── Independent feeds, re-fetched on date change ─────────────────────────
  // Triggered by `date` changes (not a poll) — a glance, not a live panel. The
  // date is read asynchronously inside the pipe, after inputs are bound, which
  // is why every journal section uses this rxjs-interop shape rather than an
  // eager resource that would read the required input too early.
  private readonly date$ = toObservable(this.date);

  private readonly gym = toSignal(
    this.date$.pipe(
      switchMap(date =>
        this.exercise.listDetailed({ date, limit: 50 }).pipe(catchError(() => of({ items: [] as SessionDetailed[] }))),
      ),
    ),
    { initialValue: null },
  );

  private readonly supplements = toSignal(
    this.date$.pipe(
      switchMap(date =>
        this.nutrition.supplementLog({ date, limit: 100 }).pipe(catchError(() => of({ items: [] as SupplementLogEntry[] }))),
      ),
    ),
    { initialValue: null },
  );

  private readonly food = toSignal(
    this.date$.pipe(
      switchMap(date =>
        this.nutrition.list({ date, limit: 100 }).pipe(catchError(() => of({ items: [] as FoodLogEntry[] }))),
      ),
    ),
    { initialValue: null },
  );

  // Week-to-date fetches: Monday of `date`'s week through `date` itself.
  // Not a trailing N-day window — this is a day view, so the only multi-day
  // question it answers is "how's this week going so far" (a running
  // total), not a trend line (that belongs on the week/month views).
  private readonly weekVolume = toSignal(
    this.date$.pipe(
      switchMap(date => {
        const weekStart = daysInWeek(weekKeyFromDate(dateFromDayKey(date)))[0];
        return this.exercise
          .daily({ from: weekStart, to: date })
          .pipe(catchError(() => of({ days: [] as GymDailyRow[] })));
      }),
    ),
    { initialValue: null },
  );

  private readonly weekNutrition = toSignal(
    this.date$.pipe(
      switchMap(date => {
        const weekStart = daysInWeek(weekKeyFromDate(dateFromDayKey(date)))[0];
        return this.nutrition
          .daily({ from: weekStart, to: date })
          .pipe(catchError(() => of({ days: [] as FoodDailyRow[] })));
      }),
    ),
    { initialValue: null },
  );

  // Same day, one week back — a fair single-day comparison (controls for
  // weekday eating patterns) for the "Protein today" meter.
  private readonly lastWeekSameDay = toSignal(
    this.date$.pipe(
      switchMap(date => {
        const sameDayLastWeek = shiftDay(date, -7);
        return this.nutrition
          .daily({ from: sameDayLastWeek, to: sameDayLastWeek })
          .pipe(catchError(() => of({ days: [] as FoodDailyRow[] })));
      }),
    ),
    { initialValue: null },
  );

  // Last week, Monday through the same weekday — a fair week-to-date vs
  // week-to-date comparison for the "This week" meter (not full-week, which
  // would unfairly compare a partial week to a complete one).
  private readonly lastWeekToDate = toSignal(
    this.date$.pipe(
      switchMap(date => {
        const weekStart = daysInWeek(weekKeyFromDate(dateFromDayKey(date)))[0];
        return this.nutrition
          .daily({ from: shiftDay(weekStart, -7), to: shiftDay(date, -7) })
          .pipe(catchError(() => of({ days: [] as FoodDailyRow[] })));
      }),
    ),
    { initialValue: null },
  );

  // Kept for the routine checklist only — "work across projects" is an
  // adherence question, distinct from the rail's project count.
  private readonly projectCount = computed(() => this.bundle()?.by_project.length ?? 0);

  private readonly healthExerciseCount = computed(() =>
    (this.bundle()?.telemetry ?? []).filter(e => e.collector === 'health_connect' && e.type === 'exercise_session').length,
  );

  // ── Routine ──────────────────────────────────────────────────────────────
  private readonly snapshot = computed<RoutineSnapshot>(() => ({
    exercise: (this.gym()?.items.length ?? 0) + this.healthExerciseCount(),
    supplements: this.supplements()?.items.length ?? 0,
    projects: this.projectCount(),
    food: this.food()?.items.length ?? 0,
  }));

  protected readonly routineItems = computed<UiChecklistItem[]>(() => {
    const s = this.snapshot();
    return ROUTINE.map(r => {
      const current = r.current(s);
      return {
        text: r.label,
        done: current >= r.target,
        meter: { current, target: r.target, display: 'dots' as const },
      };
    });
  });

  protected readonly routineDone = computed(() => this.routineItems().filter(i => i.done).length);
  protected readonly routineTotal = computed(() => this.routineItems().length);

  // ── Fuel & training magnitudes ────────────────────────────────────────────
  // The routine checklist above answers "did I do it" (adherence); these
  // answer "how much" — a count-vs-target meter flattens both into the same
  // bar, which loses the actual protein grams / training volume.
  protected readonly proteinTarget = PROTEIN_TARGET_G;
  protected readonly weekProteinTarget = PROTEIN_TARGET_G * 7;

  protected readonly macros = computed(() =>
    (this.food()?.items ?? []).reduce(
      (acc, e) => ({
        kcal: acc.kcal + (e.est_kcal ?? 0),
        protein_g: acc.protein_g + (e.est_protein_g ?? 0),
        carbs_g: acc.carbs_g + (e.est_carbs_g ?? 0),
        fat_g: acc.fat_g + (e.est_fat_g ?? 0),
      }),
      { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
    ),
  );

  protected readonly macroLabels = ['Protein', 'Carbs', 'Fat'] as const;
  protected readonly macroValues = computed(() => {
    const m = this.macros();
    return [Math.round(m.protein_g), Math.round(m.carbs_g), Math.round(m.fat_g)];
  });

  protected readonly proteinTodayG = computed(() => Math.round(this.macros().protein_g));

  // "On track" pace: how much you'd have eaten by now if spread evenly across
  // the day — only meaningful for today (a past day's pace is just its
  // target, which the bar already shows, so skip the tick there).
  protected readonly proteinPace = computed(() => {
    if (this.date() !== todayKey()) return null;
    const now = new Date();
    const dayFraction = (now.getHours() * 60 + now.getMinutes()) / (24 * 60);
    return Math.round(this.proteinTarget * dayFraction);
  });

  protected readonly proteinLastWeekSameDay = computed(() =>
    Math.round(this.lastWeekSameDay()?.days[0]?.protein_g ?? 0),
  );

  // Day-of-week pace toward the weekly target — reactive off `date` (not the
  // wall clock), so it's exact for any day, past or present.
  protected readonly weekProteinPace = computed(() => {
    const date = this.date();
    const dayIndex = daysInWeek(weekKeyFromDate(dateFromDayKey(date))).indexOf(date);
    return Math.round(this.weekProteinTarget * ((dayIndex + 1) / 7));
  });

  protected readonly weekProteinLastWeek = computed(() =>
    Math.round((this.lastWeekToDate()?.days ?? []).reduce((sum, d) => sum + d.protein_g, 0)),
  );

  protected readonly gymStats = computed(() =>
    (this.gym()?.items ?? []).reduce(
      (acc, s) => {
        const st = sessionStats(s);
        return {
          sets: acc.sets + st.sets,
          volumeKg: acc.volumeKg + st.volumeKg,
          cardioMin: acc.cardioMin + st.cardioMin,
        };
      },
      { sets: 0, volumeKg: 0, cardioMin: 0 },
    ),
  );

  protected readonly hasTraining = computed(() => {
    const g = this.gymStats();
    return g.sets > 0 || g.volumeKg > 0 || g.cardioMin > 0;
  });

  // Running totals for the week so far (Monday through today) — a single
  // number answering "how's this week going," not a day-by-day trend.
  protected readonly weekVolumeKg = computed(() =>
    (this.weekVolume()?.days ?? []).reduce((sum, d) => sum + d.volume_kg, 0),
  );

  protected readonly weekProteinG = computed(() =>
    Math.round((this.weekNutrition()?.days ?? []).reduce((sum, d) => sum + d.protein_g, 0)),
  );

  protected readonly formatMinutes = formatMinutes;
}
