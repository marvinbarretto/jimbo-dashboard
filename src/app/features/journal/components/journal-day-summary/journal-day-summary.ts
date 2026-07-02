import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, of, switchMap } from 'rxjs';
import { UiStatCard } from '@shared/components/ui-stat-card/ui-stat-card';
import { UiChecklist, type UiChecklistItem } from '@shared/components/ui-checklist/ui-checklist';
import { formatMinutes } from '@shared/utils/datetime.utils';
import { AgentRunsService, type AgentRunRollupRow } from '../../../hermes/data-access/agent-runs.service';
import { ExerciseService, type SessionDetailed } from '../../../exercise/data-access/exercise.service';
import { NutritionService, type FoodLogEntry, type SupplementLogEntry } from '../../../nutrition/data-access/nutrition.service';
import { JournalDataService } from '../../data-access/journal-data.service';
import type { DayKey } from '@shared/utils/date-keys';

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
 * Dashboard-esque "today at a glance" header for the journal day.
 *
 * Surfaces the daily routine (ticked from logged actuals), the headline work
 * numbers, and how much Jimbo has done and cost. Self-contained like its sibling
 * sections: it reads the already-loaded work bundle from the shared service and
 * fetches the supplement/food/agent feeds on date change (not polled — this is a
 * glance, not a live panel).
 */
@Component({
  selector: 'app-journal-day-summary',
  imports: [UiStatCard, UiChecklist],
  templateUrl: './journal-day-summary.html',
  styleUrl: './journal-day-summary.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JournalDaySummary {
  private readonly journal = inject(JournalDataService);
  private readonly agents = inject(AgentRunsService);
  private readonly exercise = inject(ExerciseService);
  private readonly nutrition = inject(NutritionService);

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

  private readonly agentRuns = toSignal(
    this.date$.pipe(
      switchMap(date =>
        this.agents
          .rollup({ since: `${date}T00:00:00Z`, until: `${date}T23:59:59.999Z` })
          .pipe(catchError(() => of({ items: [] as AgentRunRollupRow[] }))),
      ),
    ),
    { initialValue: null },
  );

  // ── Work headline (from the shared bundle) ───────────────────────────────
  protected readonly focusMinutes = computed(() => this.bundle()?.totals.focus_minutes ?? 0);
  protected readonly pomos = computed(() => this.bundle()?.totals.pomos_completed ?? 0);
  protected readonly projectCount = computed(() => this.bundle()?.by_project.length ?? 0);

  protected readonly commits = computed(() => {
    const telemetry = this.bundle()?.telemetry ?? [];
    return telemetry
      .filter(e => e.collector === 'github' && e.type === 'push')
      .reduce((sum, e) => sum + ((e.payload?.['commits'] as unknown[] | undefined)?.length ?? 0), 0);
  });

  private readonly healthExerciseCount = computed(() =>
    (this.bundle()?.telemetry ?? []).filter(e => e.collector === 'health_connect' && e.type === 'exercise_session').length,
  );

  // YouTube watch time, summed from the Chrome extension's watch segments. Many
  // short segments per day (one per pause/navigation) sum into real minutes
  // watched — the one number Google's own exports can't give you.
  protected readonly youtube = computed(() => {
    const sessions = (this.bundle()?.telemetry ?? []).filter(
      e => e.collector === 'youtube' && e.type === 'watch_session',
    );
    const totalSeconds = sessions.reduce((s, e) => s + (e.value ?? 0), 0);
    const byVideo = new Map<string, number>();
    const byChannel = new Map<string, number>();
    for (const e of sessions) {
      const p = e.payload ?? {};
      const videoKey = (p['videoId'] as string) || (p['url'] as string) || 'unknown';
      byVideo.set(videoKey, (byVideo.get(videoKey) ?? 0) + (e.value ?? 0));
      const channel = (p['channel'] as string) || '';
      if (channel) byChannel.set(channel, (byChannel.get(channel) ?? 0) + (e.value ?? 0));
    }
    const topChannel = [...byChannel.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    return { minutes: Math.round(totalSeconds / 60), videoCount: byVideo.size, topChannel };
  });

  protected readonly youtubeDetail = computed(() => {
    const y = this.youtube();
    if (y.videoCount === 0) return 'nothing watched';
    const videos = `${y.videoCount} ${y.videoCount === 1 ? 'video' : 'videos'}`;
    return y.topChannel ? `${videos} · ${y.topChannel}` : videos;
  });

  // ── Jimbo (agent activity + cost) ────────────────────────────────────────
  private readonly agentRows = computed(() => this.agentRuns()?.items ?? []);
  protected readonly jimboRuns = computed(() => this.agentRows().reduce((s, r) => s + r.count, 0));
  protected readonly jimboCost = computed(() => this.agentRows().reduce((s, r) => s + (r.cost_usd ?? 0), 0));
  protected readonly jimboCostLabel = computed(() => {
    const c = this.jimboCost();
    return '$' + c.toFixed(c < 0.1 ? 4 : 2);
  });
  protected readonly jimboDetail = computed(() => {
    const runs = this.jimboRuns();
    return runs ? `${runs} ${runs === 1 ? 'run' : 'runs'}` : 'idle';
  });

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
        meter: { current, target: r.target },
      };
    });
  });

  protected readonly routineDone = computed(() => this.routineItems().filter(i => i.done).length);
  protected readonly routineTotal = computed(() => this.routineItems().length);

  protected readonly formatMinutes = formatMinutes;
}
