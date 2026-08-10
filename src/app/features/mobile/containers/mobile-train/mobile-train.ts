import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { UiButton } from '@shared/components/ui-button/ui-button';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import { type QuickAddOption } from '@shared/components/ui-quick-add-row/ui-quick-add-row';
import { type TrackerDraft } from '@shared/components/tracker/tracker.types';
import { ToastService } from '@shared/components/toast/toast.service';
import { formatLondonTime, logicalDay, shiftIsoDay } from '@shared/utils/datetime.utils';
import { ExerciseSessionRow } from '@features/exercise/components/exercise-session-row/exercise-session-row';
import {
  ExerciseService,
  type ExerciseCatalogItem,
  type SessionDetailed,
  type SessionPatch,
} from '@features/exercise/data-access/exercise.service';
import { createSessionChildWriters } from '@features/exercise/data-access/exercise-ledger';
import { sessionStats } from '@features/exercise/utils/exercise-format';
import { buildExerciseHistory } from '@features/exercise/utils/exercise-history';
import { buildExerciseOptions } from '@features/exercise/utils/exercise-options';
import { injectHaptics } from '../../utils/haptics';
import { injectLogicalToday } from '../../utils/logical-today';

/**
 * Train tab — the live gym session, plus today's finished ones.
 *
 * Optimised for mid-set use: one thumb, ~3 seconds of attention. Start and
 * finish are single taps, and "same again" repeats the last set by bumping its
 * aggregated `sets` count optimistically — the row updates before the network
 * answers, because between sets is exactly when the gym's connectivity is at
 * its worst. History/analysis stays on the desktop period pages.
 */
@Component({
  selector: 'app-mobile-train',
  imports: [UiButton, UiEmptyState, UiLoadingState, ExerciseSessionRow],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './mobile-train.html',
  styleUrl: './mobile-train.scss',
})
export class MobileTrain {
  private readonly service = inject(ExerciseService);
  private readonly toast = inject(ToastService);
  private readonly haptics = injectHaptics();

  protected readonly today = injectLogicalToday();

  // Window reaches one day back so a session someone forgot to finish last
  // night is still offered as "active" (finishable) rather than silently lost.
  private readonly sessionsRes = httpResource<{ items: SessionDetailed[] }>(
    () =>
      `/api/gym/sessions/detailed?from=${shiftIsoDay(this.today(), -1)}&to=${this.today()}&limit=50`,
  );
  private readonly catalogRes = httpResource<ExerciseCatalogItem[]>(() => `/api/gym/exercises?limit=300`);
  // 180 days of history powers the "last time: 2×10×25kg" prefills — at the
  // gym, what you lifted last time IS the interface.
  private readonly historyRes = httpResource<{ items: SessionDetailed[] }>(
    () => `/api/gym/sessions/detailed?days=180&limit=200`,
  );

  protected readonly loading = computed(() => this.sessionsRes.isLoading() && !this.sessionsRes.hasValue());

  private readonly sessions = computed<SessionDetailed[]>(() => this.sessionsRes.value()?.items ?? []);

  protected readonly active = computed<SessionDetailed | null>(() => {
    const open = this.sessions().filter((s) => s.ended_at === null);
    return open.sort((a, b) => b.started_at.localeCompare(a.started_at))[0] ?? null;
  });

  /** Today's sessions other than the live one, newest first. */
  protected readonly finishedToday = computed<SessionDetailed[]>(() =>
    this.sessions()
      .filter((s) => s.id !== this.active()?.id && logicalDay(s.started_at) === this.today())
      .sort((a, b) => b.started_at.localeCompare(a.started_at)),
  );

  protected readonly exerciseIndex = computed<ReadonlyMap<string, ExerciseCatalogItem>>(
    () => new Map((this.catalogRes.value() ?? []).map((e) => [e.id, e])),
  );
  protected readonly history = computed(() => buildExerciseHistory(this.historyRes.value()?.items ?? []));
  protected readonly exerciseOptions = computed<QuickAddOption[]>(() =>
    buildExerciseOptions(this.sessions(), this.catalogRes.value() ?? [], this.exerciseIndex()),
  );

  // ── Live-session header ─────────────────────────────────────────
  protected readonly startedTime = computed(() => {
    const a = this.active();
    return a ? formatLondonTime(a.started_at) : '';
  });

  // Minute tick so the elapsed readout advances while the screen is open.
  // Clock reads live in the computed; the tick just invalidates it.
  private readonly minuteTick = signal(0);

  constructor() {
    const id = setInterval(() => this.minuteTick.update((n) => n + 1), 30_000);
    inject(DestroyRef).onDestroy(() => clearInterval(id));
  }

  protected readonly elapsedMin = computed(() => {
    this.minuteTick();
    const a = this.active();
    if (!a) return 0;
    return Math.max(0, Math.round((Date.now() - new Date(a.started_at).getTime()) / 60_000));
  });

  protected readonly activeStats = computed(() => {
    const a = this.active();
    return a ? sessionStats(a) : null;
  });

  /** The last set of the live session — what "same again" repeats. */
  protected readonly lastSet = computed(() => this.active()?.sets.at(-1) ?? null);

  protected readonly lastSetLabel = computed(() => {
    const s = this.lastSet();
    if (!s) return '';
    const bits = [s.exercise_name ?? 'set', `${s.reps ?? '?'} reps`];
    if (s.weight_kg != null) bits.push(`${s.weight_kg} kg`);
    return bits.join(' · ');
  });

  // ── Session lifecycle ───────────────────────────────────────────
  protected start(): void {
    this.haptics.tap();
    this.service.createSession({}).subscribe({
      next: () => this.reload(),
      error: () => this.toast.error('Could not start workout'),
    });
  }

  protected finish(): void {
    const a = this.active();
    if (!a) return;
    this.haptics.success();
    this.service.patchSession(a.id, { ended_at: new Date().toISOString() }).subscribe({
      next: () => this.reload(),
      error: () => this.toast.error('Could not finish workout'),
    });
  }

  /**
   * One-tap "same again": bumps the last row's aggregated `sets` count
   * (gym_session_sets stores "2 × 10 × 25kg" as one row), optimistically so
   * the UI answers the thumb before the network does. On failure the resource
   * reloads to server truth and the error is toasted.
   */
  protected repeatLastSet(): void {
    const a = this.active();
    const last = this.lastSet();
    if (!a || !last) return;
    const next = (last.sets ?? 1) + 1;

    this.haptics.tap();
    this.sessionsRes.update((v) =>
      v && {
        items: v.items.map((s) =>
          s.id !== a.id
            ? s
            : { ...s, sets: s.sets.map((x) => (x.id === last.id ? { ...x, sets: next } : x)) },
        ),
      },
    );

    this.service.patchSet(last.id, { sets: next }).subscribe({
      // Success: local state already matches the server — no reload, no flicker.
      error: () => {
        this.reload();
        this.toast.error('Could not repeat set');
      },
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

  // Set/cardio writes shared with the desktop page.
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

  protected onAddSet(e: { sessionId: string; draft: TrackerDraft }): void {
    this.haptics.tap();
    this.children.addSet(e);
  }

  private reload(): void {
    this.sessionsRes.reload();
    this.historyRes.reload();
  }
}
