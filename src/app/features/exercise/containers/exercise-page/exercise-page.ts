import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiButton } from '@shared/components/ui-button/ui-button';
import { UiBarChart } from '@shared/components/ui-bar-chart/ui-bar-chart';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import { UiPeriodTotals } from '@shared/components/ui-period-totals/ui-period-totals';
import { type QuickAddOption } from '@shared/components/ui-quick-add-row/ui-quick-add-row';
import {
  type TrackerDailyTotal,
  type TrackerDraft,
  type TrackerMeasure,
  type TrackerPatch,
} from '@shared/components/tracker/tracker.types';
import { ToastService } from '@shared/components/toast/toast.service';
import { londonDay, londonToday, relativeDayLabel, shiftIsoDay } from '@shared/utils/datetime.utils';
import { ExerciseSessionRow } from '../../components/exercise-session-row/exercise-session-row';
import {
  ExerciseService,
  type ExerciseCatalogItem,
  type GymDailyRow,
  type SessionDetailed,
  type SessionPatch,
  type SetPatch,
  type CardioPatch,
} from '../../data-access/exercise.service';

const LEDGER_DAYS = 14;
const DAILY_WINDOW = 90;

const TOTALS_MEASURES: readonly TrackerMeasure[] = [
  { key: 'volume_kg', label: 'Volume', unit: 'kg', primary: true },
  { key: 'sessions', label: 'Sessions', unit: '' },
  { key: 'cardio_min', label: 'Cardio', unit: 'min' },
];

@Component({
  selector: 'app-exercise-page',
  imports: [UiStack, UiSection, UiButton, UiBarChart, UiEmptyState, UiLoadingState, UiPeriodTotals, ExerciseSessionRow],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './exercise-page.html',
  styleUrl: './exercise-page.scss',
})
export class ExercisePage {
  private readonly service = inject(ExerciseService);
  private readonly toast = inject(ToastService);

  protected readonly totalsMeasures = TOTALS_MEASURES;
  protected readonly today = londonToday();

  private readonly sessionsRes = httpResource<{ items: SessionDetailed[] }>(
    () => `/api/gym/sessions/detailed?days=${LEDGER_DAYS}&limit=200`,
  );
  private readonly dailyRes = httpResource<{ days: GymDailyRow[] }>(
    () => `/api/gym/sessions/daily?days=${DAILY_WINDOW}`,
  );
  private readonly catalogRes = httpResource<ExerciseCatalogItem[]>(() => `/api/gym/exercises?limit=100`);

  // Spinner only on the FIRST load. During reload-after-write hasValue() stays
  // true, so the ledger is never torn down — edits keep their place and expanded
  // sessions stay open. (isLoading() alone would collapse everything on each edit.)
  protected readonly loading = computed(() => this.sessionsRes.isLoading() && !this.sessionsRes.hasValue());

  private readonly sessions = computed<SessionDetailed[]>(() => this.sessionsRes.value()?.items ?? []);
  private readonly dailyRows = computed<GymDailyRow[]>(() => this.dailyRes.value()?.days ?? []);

  protected readonly exerciseOptions = computed<QuickAddOption[]>(() =>
    (this.catalogRes.value() ?? []).map((e) => ({ id: e.id, label: e.name })),
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
    const out: { date: string; volume: number }[] = [];
    for (let i = LEDGER_DAYS - 1; i >= 0; i--) {
      const date = shiftIsoDay(this.today, -i);
      out.push({ date, volume: byDate.get(date) ?? 0 });
    }
    return out;
  });

  protected readonly trendLabels = computed(() => this.axis().map((d) => d.date.slice(5)));
  protected readonly trendValues = computed(() => this.axis().map((d) => d.volume));
  protected readonly hasTrend = computed(() => this.dailyRows().some((d) => d.sessions > 0));

  // ── Day-grouped session ledger ───────────────────────────────────
  protected readonly days = computed<{ date: string; label: string; sessions: SessionDetailed[] }[]>(() => {
    const groups = new Map<string, SessionDetailed[]>();
    for (const s of this.sessions()) {
      const day = londonDay(s.started_at);
      (groups.get(day) ?? groups.set(day, []).get(day)!).push(s);
    }
    if (!groups.has(this.today)) groups.set(this.today, []);
    for (const arr of groups.values()) arr.sort((a, b) => b.started_at.localeCompare(a.started_at));
    return [...groups.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, sessions]) => ({ date, label: relativeDayLabel(date), sessions }));
  });

  protected dayMeta(day: { sessions: SessionDetailed[] }): string {
    const n = day.sessions.length;
    if (!n) return 'rest day';
    const volume = day.sessions.reduce(
      (acc, s) => acc + s.sets.reduce((v, x) => v + (x.reps ?? 0) * (x.weight_kg ?? 0), 0),
      0,
    );
    return `${n} session${n === 1 ? '' : 's'}${volume > 0 ? ` · ${Math.round(volume)} kg` : ''}`;
  }

  // UiSection is controlled — own the open state. Today starts open; past days
  // collapse to their summary until the user expands them.
  private readonly openDays = signal<Set<string>>(new Set([this.today]));
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
    const started_at = date === this.today ? undefined : (toNoonIso(date) ?? undefined);
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

  protected onChildPatch(p: TrackerPatch): void {
    const { kind, id } = splitId(p.id);
    const v = p.changes.values ?? {};
    if (kind === 'set') {
      const patch: SetPatch = {};
      if ('sets' in v) patch.sets = v['sets'] ?? undefined;
      if ('reps' in v) patch.reps = v['reps'];
      if ('weight_kg' in v) patch.weight_kg = v['weight_kg'];
      this.service.patchSet(id, patch).subscribe({ next: () => this.reload(), error: () => this.toast.error('Could not save set') });
    } else {
      const patch: CardioPatch = {};
      if ('duration_min' in v) patch.duration_s = v['duration_min'] === null ? null : (v['duration_min'] as number) * 60;
      if ('distance_km' in v) patch.distance_km = v['distance_km'];
      if ('hr' in v) patch.avg_heart_rate = v['hr'];
      this.service.patchCardio(id, patch).subscribe({ next: () => this.reload(), error: () => this.toast.error('Could not save cardio') });
    }
  }

  protected onChildRemove(entryId: string): void {
    const { kind, id } = splitId(entryId);
    const req = kind === 'set' ? this.service.deleteSet(id) : this.service.deleteCardio(id);
    req.subscribe({ next: () => this.reload(), error: () => this.toast.error('Could not delete') });
  }

  protected onAddSet(e: { sessionId: string; draft: TrackerDraft }): void {
    if (!e.draft.ref) return;
    const session = this.sessions().find((s) => s.id === e.sessionId);
    const setNumber = (session?.sets.length ?? 0) + 1;
    this.service
      .createSet(e.sessionId, {
        exercise_id: e.draft.ref,
        set_number: setNumber,
        sets: e.draft.values['sets'],
        reps: e.draft.values['reps'],
        weight_kg: e.draft.values['weight_kg'],
      })
      .subscribe({ next: () => this.reload(), error: () => this.toast.error('Could not add set') });
  }

  private reload(): void {
    this.sessionsRes.reload();
    this.dailyRes.reload();
  }
}

function splitId(id: string): { kind: 'set' | 'cardio'; id: string } {
  const [kind, ...rest] = id.split(':');
  return { kind: kind === 'cardio' ? 'cardio' : 'set', id: rest.join(':') };
}

function toNoonIso(date: string): string | null {
  const d = new Date(`${date}T12:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
