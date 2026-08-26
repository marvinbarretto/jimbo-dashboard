import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, of, switchMap } from 'rxjs';
import { UiBarChart } from '@shared/components/ui-bar-chart/ui-bar-chart';
import { UiChecklist, type UiChecklistItem } from '@shared/components/ui-checklist/ui-checklist';
import { formatMinutes, pluralise } from '@shared/utils/datetime.utils';
import {
  type DayKey,
  dateFromDayKey,
  dayKeyOf,
  daysInMonth,
  daysInWeek,
  formatDayShort,
  shiftDay,
  shiftMonth,
  shiftWeek,
  todayKey,
} from '@shared/utils/date-keys';
import { AgentRunsService, type AgentRunRollupRow } from '../../../hermes/data-access/agent-runs.service';
import type { GymDailyRow } from '../../../exercise/data-access/exercise.service';
import { EXERCISE_READ } from '../../../exercise/data-access/exercise.read';
import type { FoodDailyRow, SupplementLogEntry } from '../../../nutrition/data-access/nutrition.service';
import { NUTRITION_READ } from '../../../nutrition/data-access/nutrition.read';
import { JournalDataService, type TelemetryEventLite } from '../../data-access/journal-data.service';
import { heartbeatBursts } from '../../utils/retro-timeline';
import { summariseYouTube } from '../../utils/youtube-consumption';
import {
  codeEvidenceSpans,
  dailyUnionMinutes,
  focusSpans,
  projectUnionMinutes,
  unionMinutes,
  type SpanMs,
} from '../../utils/work-measure';

// Mirrors journal-day-summary — no shared settings source for targets yet.
const PROTEIN_TARGET_G = 150;

// The same daily routine the day summary ticks, scored across the period:
// each row answers "how many days did I hit this", not "did I hit it today".
interface DayRoutine {
  readonly exercise: number;
  readonly supplements: number;
  readonly projects: number;
  readonly food: number;
}

const ROUTINE: readonly {
  readonly label: string;
  readonly target: number;
  readonly current: (d: DayRoutine) => number;
}[] = [
  { label: 'Move / exercise', target: 1, current: d => d.exercise },
  { label: 'Supplements', target: 3, current: d => d.supplements },
  { label: 'Work across projects', target: 2, current: d => d.projects },
  { label: 'Eat something', target: 1, current: d => d.food },
];

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
 * The routine checklist is the last thing here that is not work, and it
 * survives only because Body's week and month views have no routine section to
 * receive it yet.
 *
 * Work evidence comes from the shared work bundle the page already loads;
 * agent runs are a range endpoint fetched on window change (not polled — this
 * is a glance, not a live panel). YouTube segments are passed in by the page,
 * which owns the telemetry query.
 */
@Component({
  selector: 'app-journal-period-summary',
  imports: [RouterLink, UiBarChart, UiChecklist],
  templateUrl: './journal-period-summary.html',
  styleUrls: ['./journal-period-summary.scss', '../../journal-sections.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JournalPeriodSummary {
  private readonly journal = inject(JournalDataService);
  private readonly agents = inject(AgentRunsService);
  private readonly exercise = inject(EXERCISE_READ);
  private readonly nutrition = inject(NUTRITION_READ);

  readonly granularity = input.required<'week' | 'month'>();
  readonly key = input.required<string>();
  /** YouTube watch segments for the window — fetched by the owning page. */
  readonly youtubeEvents = input<readonly TelemetryEventLite[]>([]);

  protected readonly days = computed<readonly DayKey[]>(() =>
    this.granularity() === 'week' ? daysInWeek(this.key()) : daysInMonth(this.key()));

  // Days that have actually happened. A live week judged against seven days
  // always reads as failing on Tuesday — targets and adherence scale to here.
  private readonly elapsedDays = computed<readonly DayKey[]>(() => {
    const days = this.days();
    const today = todayKey();
    if (!days.length || days[0]! > today) return [];
    const i = days.indexOf(today);
    return i >= 0 ? days.slice(0, i + 1) : days;
  });

  protected readonly elapsedCount = computed(() => this.elapsedDays().length);

  private readonly range = computed(() => {
    const days = this.days();
    return { from: days[0]!, to: days.at(-1)! };
  });

  // The previous period, truncated to the same number of elapsed days — a
  // partial week compared against a full one always looks like a collapse.
  // Month uses the calendar month before (not "31 days back", which lands
  // mid-month whenever the two months differ in length).
  private readonly previousRange = computed(() => {
    const previousDays = this.granularity() === 'week'
      ? daysInWeek(shiftWeek(this.key(), -1))
      : daysInMonth(shiftMonth(this.key(), -1));
    const elapsed = this.elapsedDays().length || this.days().length;
    return {
      from: previousDays[0]!,
      to: previousDays[Math.min(elapsed, previousDays.length) - 1]!,
    };
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

  private readonly previousNutrition = toSignal(
    toObservable(this.previousRange).pipe(
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

  // 500 rows ≈ 16 supplements a day for a month — far above any real intake.
  private readonly supplements = toSignal(
    this.range$.pipe(
      switchMap(({ from, to }) =>
        this.nutrition
          .supplementLog({ from, to, limit: 500 })
          .pipe(catchError(() => of({ items: [] as SupplementLogEntry[] })))),
    ),
    { initialValue: null },
  );

  private readonly agentRuns = toSignal(
    this.window$.pipe(
      switchMap(w =>
        this.agents.rollup(w).pipe(catchError(() => of({ items: [] as AgentRunRollupRow[] })))),
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
  protected readonly pomos = computed(() =>
    this.focusSessions().filter(s => s.status === 'completed').length);

  protected readonly deskPerDay = computed(() => dailyUnionMinutes(
    this.deskSpans(),
    this.days().map(d => ({
      startMs: dateFromDayKey(d).getTime(),
      endMs: dateFromDayKey(shiftDay(d, 1)).getTime(),
    })),
  ));

  protected readonly activeDays = computed(() => this.deskPerDay().filter(m => m > 0).length);

  private readonly projectWork = computed(() =>
    projectUnionMinutes(this.focusSessions(), this.ownCodeSessions(), this.bursts()));

  protected readonly projectCount = computed(() => this.projectWork().length);

  protected readonly commits = computed(() =>
    (this.bundle()?.github_pushes ?? []).reduce(
      (sum, e) => sum + ((e.payload?.['commits'] as unknown[] | undefined)?.length ?? 0), 0));

  // ── Jimbo ────────────────────────────────────────────────────────────────
  private readonly agentRows = computed(() => this.agentRuns()?.items ?? []);
  protected readonly jimboRuns = computed(() => this.agentRows().reduce((s, r) => s + r.count, 0));
  protected readonly jimboCostLabel = computed(() => {
    const c = this.agentRows().reduce((s, r) => s + (r.cost_usd ?? 0), 0);
    return '$' + c.toFixed(c < 0.1 ? 4 : 2);
  });
  protected readonly jimboDetail = computed(() => {
    const runs = this.jimboRuns();
    return runs ? pluralise(runs, 'run') : 'idle';
  });

  // ── Consumption ──────────────────────────────────────────────────────────
  private readonly youtube = computed(() => summariseYouTube(this.youtubeEvents()));
  protected readonly youtubeMinutes = computed(() => Math.round(this.youtube().totalSeconds / 60));
  protected readonly youtubeDetail = computed(() => {
    const y = this.youtube();
    if (!y.videoCount) return 'nothing watched';
    const top = y.channels[0]?.channel;
    const videos = pluralise(y.videoCount, 'video');
    return top ? `${videos} · ${top}` : videos;
  });

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

  private readonly supplementsByDay = computed(() => {
    const map = new Map<DayKey, number>();
    for (const s of this.supplements()?.items ?? []) {
      const day = dayKeyOf(s.taken_at);
      if (day) map.set(day, (map.get(day) ?? 0) + 1);
    }
    return map;
  });

  // Distinct projects touched per day, from the same evidence the desk
  // minutes use — a day counts a project once however it was worked.
  private readonly projectsByDay = computed(() => {
    const map = new Map<DayKey, Set<string>>();
    const add = (iso: string, projectId: string | null) => {
      const day = dayKeyOf(iso);
      if (!day || !projectId) return;
      const set = map.get(day) ?? new Set<string>();
      set.add(projectId);
      map.set(day, set);
    };
    for (const s of this.focusSessions()) add(s.started_at, s.project_id);
    for (const s of this.ownCodeSessions()) add(s.started_at, s.project_id);
    return map;
  });

  protected readonly routineItems = computed<UiChecklistItem[]>(() => {
    const days = this.elapsedDays();
    const gym = this.gymByDay();
    const food = this.foodByDay();
    const supps = this.supplementsByDay();
    const projects = this.projectsByDay();

    // Health Connect exercise sessions (in the day bundle's telemetry) aren't
    // fetched for a window — gym sessions are the range-queryable signal, so
    // a period can under-count a walk-only day the day view would tick.
    const snapshots = days.map<DayRoutine>(d => ({
      exercise: (gym.get(d)?.sessions ?? 0) + (gym.get(d)?.cardio_count ?? 0),
      supplements: supps.get(d) ?? 0,
      projects: projects.get(d)?.size ?? 0,
      food: food.get(d)?.count ?? 0,
    }));

    return ROUTINE.map(r => {
      const hit = snapshots.filter(s => r.current(s) >= r.target).length;
      return {
        text: r.label,
        done: days.length > 0 && hit === days.length,
        meter: { current: hit, target: days.length, unit: 'days', display: 'dots' as const },
      };
    });
  });

  protected readonly routineDone = computed(() => this.routineItems().filter(i => i.done).length);
  protected readonly routineTotal = computed(() => this.routineItems().length);

  // ── Fuel & training ──────────────────────────────────────────────────────
  protected readonly proteinTarget = computed(() => PROTEIN_TARGET_G * this.days().length);
  /** Where an on-target period would stand by now — the pace tick. */
  protected readonly proteinPace = computed(() =>
    this.elapsedCount() < this.days().length ? PROTEIN_TARGET_G * this.elapsedCount() : null);

  protected readonly macros = computed(() =>
    (this.nutritionDaily()?.days ?? []).reduce(
      (acc, d) => ({
        kcal: acc.kcal + d.kcal,
        protein_g: acc.protein_g + d.protein_g,
        carbs_g: acc.carbs_g + d.carbs_g,
        fat_g: acc.fat_g + d.fat_g,
      }),
      { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
    ));

  protected readonly proteinG = computed(() => Math.round(this.macros().protein_g));
  protected readonly proteinPreviousG = computed(() =>
    Math.round((this.previousNutrition()?.days ?? []).reduce((s, d) => s + d.protein_g, 0)));

  protected readonly compareLabel = computed(() =>
    this.granularity() === 'week' ? 'same point last week' : 'same point last month');

  protected readonly macroLabels = ['Protein', 'Carbs', 'Fat'] as const;
  protected readonly macroValues = computed(() => {
    const m = this.macros();
    return [Math.round(m.protein_g), Math.round(m.carbs_g), Math.round(m.fat_g)];
  });

  protected readonly gymTotals = computed(() =>
    (this.gymDaily()?.days ?? []).reduce(
      (acc, d) => ({
        sessions: acc.sessions + d.sessions,
        sets: acc.sets + d.sets,
        volumeKg: acc.volumeKg + d.volume_kg,
        cardioMin: acc.cardioMin + Math.round(d.cardio_duration_s / 60),
        trainedDays: acc.trainedDays + (d.sessions > 0 || d.cardio_count > 0 ? 1 : 0),
      }),
      { sessions: 0, sets: 0, volumeKg: 0, cardioMin: 0, trainedDays: 0 },
    ));

  protected readonly hasTraining = computed(() => this.gymTotals().sessions > 0 || this.gymTotals().cardioMin > 0);

  // ── Per-day series ───────────────────────────────────────────────────────
  protected readonly dayLabels = computed(() =>
    this.granularity() === 'week'
      ? this.days().map(d => formatDayShort(d))
      : this.days().map(d => d.slice(-2)));

  protected readonly proteinPerDay = computed(() => {
    const byDay = this.foodByDay();
    return this.days().map(d => Math.round(byDay.get(d)?.protein_g ?? 0));
  });

  protected readonly volumePerDay = computed(() => {
    const byDay = this.gymByDay();
    return this.days().map(d => Math.round(byDay.get(d)?.volume_kg ?? 0));
  });

  protected readonly hasProtein = computed(() => this.proteinPerDay().some(v => v > 0));
  protected readonly hasVolume = computed(() => this.volumePerDay().some(v => v > 0));

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
