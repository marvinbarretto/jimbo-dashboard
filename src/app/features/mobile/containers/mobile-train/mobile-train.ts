import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { UiBarChart } from '@shared/components/ui-bar-chart/ui-bar-chart';
import { UiButton } from '@shared/components/ui-button/ui-button';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import { type QuickAddOption } from '@shared/components/ui-quick-add-row/ui-quick-add-row';
import { type TrackerDraft } from '@shared/components/tracker/tracker.types';
import { ToastService } from '@shared/components/toast/toast.service';
import { formatLondonTime, logicalDay, relativeDayLabel, shiftIsoDay } from '@shared/utils/datetime.utils';
import { pollWhileVisible } from '@features/journal/utils/live-poll';
import { ExerciseSessionRow } from '@features/exercise/components/exercise-session-row/exercise-session-row';
import {
  ExerciseService,
  type ExerciseCatalogItem,
  type GymDailyRow,
  type SessionDetailed,
  type SessionPatch,
} from '@features/exercise/data-access/exercise.service';
import { createSessionChildWriters } from '@features/exercise/data-access/exercise-ledger';
import { sessionStats } from '@features/exercise/utils/exercise-format';
import { buildExerciseHistory, type HistorySession } from '@features/exercise/utils/exercise-history';
import { buildExerciseOptions, resolveExerciseByLabel } from '@features/exercise/utils/exercise-options';
import { injectHaptics } from '../../utils/haptics';
import { injectLogicalToday } from '../../utils/logical-today';
import { weekAxis } from '../../utils/week-axis';

/** The bare session row /api/gym/sessions/active returns (no sets/cardio). */
type ActiveSessionInfo = {
  id: string;
  started_at: string;
  ended_at: string | null;
} | null;

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
  imports: [UiBarChart, UiButton, UiEmptyState, UiLoadingState, ExerciseSessionRow],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './mobile-train.html',
  styleUrl: './mobile-train.scss',
})
export class MobileTrain {
  private readonly service = inject(ExerciseService);
  private readonly toast = inject(ToastService);
  private readonly haptics = injectHaptics();

  protected readonly today = injectLogicalToday();

  // Window reaches one day back so last night's session renders in full.
  private readonly sessionsRes = httpResource<{ items: SessionDetailed[] }>(
    () =>
      `/api/gym/sessions/detailed?from=${shiftIsoDay(this.today(), -1)}&to=${this.today()}&limit=50`,
  );
  // The server's answer to "is anything unfinished?" — unlike the window
  // above it has no horizon, so a session forgotten since Friday still
  // surfaces (as a finishable banner, since its detail is outside the window).
  private readonly activeRes = httpResource<ActiveSessionInfo>(() => `/api/gym/sessions/active`);
  private readonly catalogRes = httpResource<ExerciseCatalogItem[]>(() => `/api/gym/exercises?limit=300`);
  /**
   * Deferred-history latch: the 180-day fetch is the tab's heaviest call, and
   * on a visit with no session on screen nothing consumes it — prefills only
   * matter once a session row exists. Flips true when one does (a session
   * starts, or the window loads finished ones) and stays true, so finishing
   * or deleting the day's last session doesn't idle the resource and drop the
   * already-loaded history mid-render.
   */
  private readonly historyWanted = signal(false);

  // 180 days of history powers the "last time: 2×10×25kg" prefills — at the
  // gym, what you lifted last time IS the interface. Idle until a session row
  // needs it (undefined request = no fetch), and served by the slim history
  // endpoint: prefill fields only, ~75% smaller than /sessions/detailed.
  private readonly historyRes = httpResource<{ items: HistorySession[] }>(() =>
    this.historyWanted() ? `/api/gym/sessions/history?days=180&limit=200` : undefined,
  );
  // Trailing week for the volume strip — the "seeing data back" ask.
  private readonly dailyRes = httpResource<{ days: GymDailyRow[] }>(
    () => `/api/gym/sessions/daily?from=${shiftIsoDay(this.today(), -6)}&to=${this.today()}`,
  );

  protected readonly loading = computed(() => this.sessionsRes.isLoading() && !this.sessionsRes.hasValue());

  // A resource in error state THROWS from value() — hasValue() is the guard,
  // not ?. — so failures surface as UI instead of killing the render.
  protected readonly loadFailed = computed(() => this.sessionsRes.error() !== undefined);

  protected retry(): void {
    this.sessionsRes.reload();
    this.activeRes.reload();
    this.catalogRes.reload();
    if (this.historyWanted()) this.historyRes.reload();
    this.dailyRes.reload();
  }

  protected readonly week = computed(() =>
    weekAxis(
      this.today(),
      this.dailyRes.hasValue() ? this.dailyRes.value().days : [],
      (d) => d.date,
      (d) => d.volume_kg,
    ),
  );
  // Gate on data-loaded, not non-zero: a cardio-only or bodyweight week sums
  // to volume 0 and is still a week the user trained.
  protected readonly hasWeek = computed(() => this.dailyRes.hasValue());

  private readonly sessions = computed<SessionDetailed[]>(() =>
    this.sessionsRes.hasValue() ? this.sessionsRes.value().items : [],
  );

  private readonly activeInfo = computed<ActiveSessionInfo>(() =>
    this.activeRes.hasValue() ? this.activeRes.value() : null,
  );

  /**
   * The live session with full detail. Server's active answer wins; window
   * scan is the fallback while activeRes is loading or failed.
   */
  protected readonly active = computed<SessionDetailed | null>(() => {
    const open = this.sessions().filter((s) => s.ended_at === null);
    const serverActive = this.activeInfo();
    if (serverActive) return open.find((s) => s.id === serverActive.id) ?? open[0] ?? null;
    return open.sort((a, b) => b.started_at.localeCompare(a.started_at))[0] ?? null;
  });

  /**
   * An unfinished session too old for the detail window — offered as a
   * closable banner so it can't silently rot with ended_at null (the server
   * happily opens a second session alongside it).
   */
  protected readonly staleActive = computed(() => {
    const info = this.activeInfo();
    if (!info || info.ended_at !== null) return null;
    if (this.sessions().some((s) => s.id === info.id)) return null;
    return { id: info.id, label: relativeDayLabel(logicalDay(info.started_at)) };
  });

  /** Today's sessions other than the live one, newest first. */
  protected readonly finishedToday = computed<SessionDetailed[]>(() =>
    this.sessions()
      .filter((s) => s.id !== this.active()?.id && logicalDay(s.started_at) === this.today())
      .sort((a, b) => b.started_at.localeCompare(a.started_at)),
  );

  protected readonly exerciseIndex = computed<ReadonlyMap<string, ExerciseCatalogItem>>(
    () => new Map((this.catalogRes.hasValue() ? this.catalogRes.value() : []).map((e) => [e.id, e])),
  );
  protected readonly history = computed(() =>
    buildExerciseHistory(this.historyRes.hasValue() ? this.historyRes.value().items : []),
  );
  protected readonly exerciseOptions = computed<QuickAddOption[]>(() =>
    buildExerciseOptions(
      this.sessions(),
      this.catalogRes.hasValue() ? this.catalogRes.value() : [],
      this.exerciseIndex(),
    ),
  );

  // ── Live-session header ─────────────────────────────────────────
  protected readonly startedTime = computed(() => {
    const a = this.active();
    return a ? formatLondonTime(a.started_at) : '';
  });

  // Minute tick so the elapsed readout advances while the screen is open —
  // visibility-gated, so a backgrounded WebView isn't burning timers.
  private readonly minuteTick = signal(0);

  constructor() {
    pollWhileVisible(() => this.minuteTick.update((n) => n + 1));
    effect(() => {
      if (this.active() !== null || this.finishedToday().length > 0) this.historyWanted.set(true);
    });
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
      next: () => this.reloadSessions(),
      error: () => this.toast.error('Could not start workout'),
    });
  }

  protected finish(): void {
    const a = this.active();
    if (!a) return;
    this.haptics.success();
    this.service.patchSession(a.id, { ended_at: new Date().toISOString() }).subscribe({
      // History changes when a session closes — the next one's "last time"
      // prefills should cite it.
      next: () => this.reloadAll(),
      error: () => this.toast.error('Could not finish workout'),
    });
  }

  protected finishStale(id: string): void {
    this.haptics.success();
    this.service.patchSession(id, { ended_at: new Date().toISOString() }).subscribe({
      next: () => this.reloadAll(),
      error: () => this.toast.error('Could not close session'),
    });
  }

  /** In-flight guard: one "same again" at a time, so bumps can't race. */
  protected readonly repeatPending = signal(false);

  /**
   * One-tap "same again": bumps the last row's aggregated `sets` count
   * (gym_session_sets stores "2 × 10 × 25kg" as one row), optimistically so
   * the UI answers the thumb before the network does. Single-flight — a second
   * tap while one is pending is dropped, otherwise two PATCHes carrying n+1
   * and n+2 could land out of order and silently diverge from the server. On
   * success the server row is applied (reconcile, no refetch); on failure the
   * resource reloads to server truth.
   */
  protected repeatLastSet(): void {
    const a = this.active();
    const last = this.lastSet();
    if (!a || !last || this.repeatPending()) return;
    const next = (last.sets ?? 1) + 1;

    this.repeatPending.set(true);
    this.haptics.tap();
    this.applySetCount(a.id, last.id, next);

    this.service.patchSet(last.id, { sets: next }).subscribe({
      next: (row) => {
        this.applySetCount(a.id, last.id, row.sets ?? next);
        this.repeatPending.set(false);
      },
      error: () => {
        this.repeatPending.set(false);
        this.reloadSessions();
        this.toast.error('Could not repeat set');
      },
    });
  }

  private applySetCount(sessionId: string, setId: string, count: number): void {
    this.sessionsRes.update((v) =>
      v && {
        items: v.items.map((s) =>
          s.id !== sessionId
            ? s
            : { ...s, sets: s.sets.map((x) => (x.id === setId ? { ...x, sets: count } : x)) },
        ),
      },
    );
  }

  protected onSessionPatch(e: { id: string; changes: SessionPatch }): void {
    this.service.patchSession(e.id, e.changes).subscribe({
      next: () => this.reloadSessions(),
      error: () => this.toast.error('Could not save edit'),
    });
  }

  protected onSessionRemove(id: string): void {
    this.service.deleteSession(id).subscribe({
      next: () => this.reloadAll(),
      error: () => this.toast.error('Could not delete workout'),
    });
  }

  // Set/cardio writes shared with the desktop page. Child writes reload only
  // the session window: the 180-day history deliberately excludes the live
  // session ("last time" cites strictly earlier sessions), so refetching it
  // per rep would be pure waste on the gym's worst-case network.
  protected readonly children = createSessionChildWriters({
    service: this.service,
    toast: this.toast,
    sessions: () => this.sessions(),
    resolveExercise: (name) => resolveExerciseByLabel(this.exerciseOptions(), name),
    reload: () => this.reloadSessions(),
  });

  protected onAddSet(e: { sessionId: string; draft: TrackerDraft }): void {
    this.haptics.tap();
    this.children.addSet(e);
  }

  private reloadSessions(): void {
    this.sessionsRes.reload();
    this.activeRes.reload();
    this.dailyRes.reload(); // today's bar in the volume strip
  }

  private reloadAll(): void {
    this.reloadSessions();
    if (this.historyWanted()) this.historyRes.reload();
  }
}
