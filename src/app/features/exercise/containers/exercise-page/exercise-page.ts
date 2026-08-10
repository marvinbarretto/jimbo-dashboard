import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UiPage } from '@shared/components/ui-page/ui-page';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiButton } from '@shared/components/ui-button/ui-button';
import { UiBarChart } from '@shared/components/ui-bar-chart/ui-bar-chart';
import { UiDonutChart } from '@shared/components/ui-donut-chart/ui-donut-chart';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import { UiPeriodTotals } from '@shared/components/ui-period-totals/ui-period-totals';
import { type TrackerPeriod } from '@shared/components/ui-period-totals/period-window';
import { UiPeriodPager } from '@shared/components/ui-period-pager/ui-period-pager';
import { type QuickAddOption } from '@shared/components/ui-quick-add-row/ui-quick-add-row';
import {
  type TrackerDailyTotal,
  type TrackerMeasure,
} from '@shared/components/tracker/tracker.types';
import { ToastService } from '@shared/components/toast/toast.service';
import { logicalDay, relativeDayLabel } from '@shared/utils/datetime.utils';
import { createTrackerPageSignals } from '@shared/utils/tracker-page-signals';
import { sessionStats } from '../../utils/exercise-format';
import { ExerciseSessionRow } from '../../components/exercise-session-row/exercise-session-row';
import {
  ExerciseService,
  type ExerciseCatalogItem,
  type GymDailyRow,
  type SessionDetailed,
  type SessionPatch,
} from '../../data-access/exercise.service';
import { createSessionChildWriters } from '../../data-access/exercise-ledger';
import { bodyPartBreakdown, lastTrainedByRegion } from '../../utils/muscle-region';
import { buildExerciseHistory } from '../../utils/exercise-history';
import { buildExerciseOptions } from '../../utils/exercise-options';

const TOTALS_MEASURES: readonly TrackerMeasure[] = [
  { key: 'volume_kg', label: 'Volume', unit: 'kg', primary: true },
  { key: 'sessions', label: 'Sessions', unit: '' },
  { key: 'cardio_min', label: 'Cardio', unit: 'min' },
];

const COVERAGE_LABEL: Record<TrackerPeriod, string> = {
  day: 'not today',
  week: 'not this week',
  month: 'not this month',
};

@Component({
  selector: 'app-exercise-page',
  imports: [
    UiPage, UiStack, UiSection, UiButton, UiBarChart, UiDonutChart, UiEmptyState, UiLoadingState,
    UiPeriodTotals, UiPeriodPager, ExerciseSessionRow,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './exercise-page.html',
  styleUrl: './exercise-page.scss',
})
export class ExercisePage {
  private readonly service = inject(ExerciseService);
  private readonly toast = inject(ToastService);

  protected readonly totalsMeasures = TOTALS_MEASURES;

  protected readonly pager = createTrackerPageSignals({
    basePath: 'exercise',
    route: inject(ActivatedRoute),
    router: inject(Router),
  });

  protected readonly granularity = this.pager.granularity;
  protected readonly todayIso = this.pager.todayIso;

  private readonly sessionsRes = httpResource<{ items: SessionDetailed[] }>(
    () => `/api/gym/sessions/detailed?from=${this.pager.window().start}&to=${this.pager.window().end}&limit=200`,
  );
  private readonly dailyRes = httpResource<{ days: GymDailyRow[] }>(
    () => `/api/gym/sessions/daily?from=${this.pager.window().start}&to=${this.pager.window().end}`,
  );
  private readonly catalogRes = httpResource<ExerciseCatalogItem[]>(() => `/api/gym/exercises?limit=300`);
  private readonly historyRes = httpResource<{ items: SessionDetailed[] }>(
    () => `/api/gym/sessions/detailed?days=180&limit=200`,
  );

  protected readonly loading = computed(() => this.sessionsRes.isLoading() && !this.sessionsRes.hasValue());

  private readonly sessions = computed<SessionDetailed[]>(() => this.sessionsRes.value()?.items ?? []);
  protected readonly history = computed(() => buildExerciseHistory(this.historyRes.value()?.items ?? []));
  private readonly dailyRows = computed<GymDailyRow[]>(() => this.dailyRes.value()?.days ?? []);

  protected readonly exerciseOptions = computed<QuickAddOption[]>(() =>
    buildExerciseOptions(this.sessions(), this.catalogRes.value() ?? [], this.exerciseIndex()),
  );

  // ── Period totals + trend ────────────────────────────────────────
  protected readonly dailyTotals = computed<TrackerDailyTotal[]>(() =>
    this.dailyRows().map((d) => ({
      date: d.date,
      count: d.sessions,
      values: { volume_kg: d.volume_kg, sessions: d.sessions, cardio_min: Math.round(d.cardio_duration_s / 60) },
    })),
  );

  private readonly axis = computed(() => {
    const byDate = new Map(this.dailyRows().map((d) => [d.date, d.volume_kg]));
    return this.pager.windowDays().map((date) => ({ date, volume: byDate.get(date) ?? 0 }));
  });

  protected readonly trendLabels = computed(() => this.axis().map((d) => d.date.slice(5)));
  protected readonly trendValues = computed(() => this.axis().map((d) => d.volume));
  protected readonly hasTrend = computed(() => this.dailyRows().some((d) => d.sessions > 0));

  // ── Body parts worked (within the selected window) ────────────────
  protected readonly exerciseIndex = computed<ReadonlyMap<string, ExerciseCatalogItem>>(
    () => new Map((this.catalogRes.value() ?? []).map((e) => [e.id, e])),
  );
  private readonly bodyPartChart = computed(() => bodyPartBreakdown(this.sessions(), this.exerciseIndex()));
  protected readonly bodyPartLabels = computed(() => this.bodyPartChart().map((r) => r.label));
  protected readonly bodyPartValues = computed(() => this.bodyPartChart().map((r) => r.count));
  protected readonly hasBodyPartData = computed(() => this.bodyPartChart().some((r) => r.count > 0));
  protected readonly bodyPartCoverage = computed(() =>
    lastTrainedByRegion(this.sessions(), this.exerciseIndex(), this.todayIso),
  );
  protected readonly coverageEmptyLabel = computed(() => COVERAGE_LABEL[this.granularity]);

  // ── Day-grouped session ledger ───────────────────────────────────
  protected readonly days = computed<{ date: string; label: string; sessions: SessionDetailed[] }[]>(() => {
    const groups = new Map<string, SessionDetailed[]>();
    for (const s of this.sessions()) {
      const day = logicalDay(s.started_at);
      (groups.get(day) ?? groups.set(day, []).get(day)!).push(s);
    }
    for (const d of this.pager.windowDays()) if (!groups.has(d)) groups.set(d, []);
    for (const arr of groups.values()) arr.sort((a, b) => b.started_at.localeCompare(a.started_at));
    return [...groups.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, sessions]) => ({ date, label: relativeDayLabel(date), sessions }));
  });

  protected dayMeta(day: { sessions: SessionDetailed[] }): string {
    const n = day.sessions.length;
    if (!n) return 'rest day';
    const volume = day.sessions.reduce((acc, s) => acc + sessionStats(s).volumeKg, 0);
    return `${n} session${n === 1 ? '' : 's'}${volume > 0 ? ` · ${Math.round(volume)} kg` : ''}`;
  }

  private readonly openDays = signal<Set<string>>(new Set([this.todayIso]));
  protected isDayOpen(date: string): boolean {
    return this.openDays().has(date);
  }
  protected toggleDay(date: string): void {
    this.openDays.update((s) => {
      const next = new Set(s);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  }

  // ── Write handlers (reload-on-write) ─────────────────────────────
  protected addSession(date: string): void {
    const started_at = date === this.todayIso ? undefined : (toNoonIso(date) ?? undefined);
    this.service.createSession({ started_at }).subscribe({
      next: () => this.reload(),
      error: () => this.toast.error('Could not start workout'),
    });
  }

  protected onSessionPatch(e: { id: string; changes: SessionPatch }): void {
    this.service.patchSession(e.id, e.changes).subscribe({
      next: () => this.reload(),
      error: () => this.toast.error('Could not save edit'),
    });
  }

  protected onSessionRemove(id: string): void {
    this.service.deleteSession(id).subscribe({
      next: () => this.reload(),
      error: () => this.toast.error('Could not delete workout'),
    });
  }

  // Set/cardio writes are shared with the phone Train tab — see
  // createSessionChildWriters.
  protected readonly children = createSessionChildWriters({
    service: this.service,
    toast: this.toast,
    sessions: () => this.sessions(),
    resolveExercise: (name) => {
      const n = name.trim().toLowerCase();
      return this.exerciseOptions().find((o) => o.label.trim().toLowerCase() === n)?.id;
    },
    reload: () => this.reload(),
  });

  private reload(): void {
    this.sessionsRes.reload();
    this.dailyRes.reload();
    this.historyRes.reload();
  }
}

function toNoonIso(date: string): string | null {
  const d = new Date(`${date}T12:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
