import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { UiButton } from '@shared/components/ui-button/ui-button';
import { UiScorePicker } from '@shared/components/ui-score-picker/ui-score-picker';
import { ToastService } from '@shared/components/toast/toast.service';
import { logicalDay, shiftIsoDay } from '@shared/utils/datetime.utils';
import { daypartAt } from '@shared/utils/daypart';
import { injectHaptics } from '@shared/utils/haptics';
import { pollWhileVisible } from '@features/journal/utils/live-poll';
import { CheckinsService } from '@features/checkins/data-access/checkins.service';
import { FocusSessionsService } from '@features/pomo/data-access/focus-sessions.service';
import { type BriefingAnalysis } from '@features/briefings/data-access/briefing.types';
import { MOOD_LABELS, ENERGY_LABELS, type MoodLogEntry } from '@domain/checkins';
import { type DayChecksResponse } from '@domain/day-checks';
import { type LiveStatus } from '@domain/live-status';
import {
  NutritionService,
  frequentFoodsResource,
  type FoodLogEntry,
} from '@features/nutrition/data-access/nutrition.service';
import { createUsualLogger } from '@features/nutrition/data-access/nutrition-ledger';
import { buildUsuals, tallyUsuals, type Usual } from '@features/nutrition/data-access/usuals';
import {
  buildDaypartHistogram,
  rankUsualsForDaypart,
} from '@features/nutrition/utils/usual-daypart';
import { UsualGrid } from '@features/nutrition/components/usual-grid/usual-grid';
import { liveStatusResource, LIVE_STATUS_POLL_MS } from '../../data-access/live-status';
import { injectLogicalToday } from '../../utils/logical-today';
import { injectMinuteClock } from '../../utils/minute-clock';
import { buildGlance } from '../../utils/glance';
import { buildAttention } from '../../utils/attention';
import { buildDayShape } from '../../utils/day-shape';
import { summariseChecks } from '../../utils/day-checks-progress';
import { selectNowCard, type ActiveFocus } from '../../utils/now-card';
import { SHORTCUT_TILES, applyBadges } from '../../utils/shortcut-tiles';
import { MobileGlanceBar } from '../../components/mobile-glance-bar/mobile-glance-bar';
import { MobileShortcutLauncher } from '../../components/mobile-shortcut-launcher/mobile-shortcut-launcher';
import { MobileAttentionRow } from '../../components/mobile-attention-row/mobile-attention-row';
import { MobileFocusCard } from '../../components/mobile-focus-card/mobile-focus-card';
import { MobileCloseDayCard } from '../../components/mobile-close-day-card/mobile-close-day-card';
import { MobileShapeCard } from '../../components/mobile-shape-card/mobile-shape-card';

/** Logging cells in the quick-log grid; the fourth cell is the link to the Log tab. */
const GRID_SLOTS = 3;

/**
 * Candidate pool handed to the daypart ranker. Wider than the grid because
 * buildUsuals' own default is tuned for a six-chip strip — re-ranking needs
 * something to reorder, not an already-truncated list.
 */
const USUAL_CANDIDATES = 12;

/** Days of log history behind the time-of-day ranking. */
const HISTOGRAM_DAYS = 30;

/** Everything not on the live-status poll moves on human timescales. */
const SLOW_POLL_MS = 5 * 60_000;

/**
 * Home — the phone's landing screen.
 *
 * Four fixed slots whose contents change with the day: a read-only glance bar,
 * the day's plan, a launcher, and the quick-log grid in the thumb zone. The
 * structure never moves so it stays muscle memory; only what fills it varies.
 *
 * Built around what actually gets typed into this phone every day — food and
 * drink, three to six times, overwhelmingly repeats — so one-tap logging is the
 * hero and everything else is a fast lane to somewhere else.
 *
 * Sections gate independently: the check-in is an input and must never sit
 * behind a briefing fetch that 404s all pre-dawn.
 */
@Component({
  selector: 'app-mobile-home',
  imports: [
    RouterLink,
    UiButton,
    UiScorePicker,
    MobileGlanceBar,
    MobileShortcutLauncher,
    MobileAttentionRow,
    MobileFocusCard,
    MobileCloseDayCard,
    MobileShapeCard,
    UsualGrid,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './mobile-home.html',
  styleUrl: './mobile-home.scss',
  host: { 'data-testid': 'mobile-home' },
})
export class MobileHome {
  private readonly checkins = inject(CheckinsService);
  private readonly nutrition = inject(NutritionService);
  private readonly focus = inject(FocusSessionsService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly haptics = injectHaptics();

  protected readonly today = injectLogicalToday();
  protected readonly moodLabels = MOOD_LABELS;
  protected readonly energyLabels = ENERGY_LABELS;

  // Tab reuse detaches rather than destroys this component, so ngOnInit never
  // runs again — a daypart captured at construction would still be offering
  // breakfast at 21:00. Polled, so the grid re-ranks as the day moves.
  private readonly now = injectMinuteClock();
  protected readonly daypart = computed(() => daypartAt(this.now()));

  private readonly briefingRes = httpResource<BriefingAnalysis>(() => `/api/briefing/latest`);
  private readonly checkinsRes = httpResource<{ items: MoodLogEntry[] }>(
    () => `/api/checkins?date=${this.today()}&limit=20`,
  );
  private readonly foodRes = httpResource<{ items: FoodLogEntry[] }>(
    () => `/api/coach/food-log?from=${this.today()}&to=${this.today()}&limit=200`,
  );
  private readonly frequentRes = frequentFoodsResource();
  // Range-encoded rather than ?days=30: httpResource refetches when the URL
  // string changes, so this rolls over on its own at the 04:00 cutover. A
  // constant `days` param would fetch once and never again in a parked WebView.
  private readonly historyRes = httpResource<{ items: FoodLogEntry[] }>(
    () =>
      `/api/coach/food-log?from=${shiftIsoDay(this.today(), -(HISTOGRAM_DAYS - 1))}` +
      `&to=${this.today()}&limit=500`,
  );
  private readonly checksRes = httpResource<DayChecksResponse>(
    () => `/api/day-checks/day?date=${this.today()}`,
  );
  private readonly liveRes = liveStatusResource();

  constructor() {
    // The briefing lands mid-morning and /latest 404s before it, and checks get
    // answered from the journal, MCP and Telegram — a parked tab must pick both
    // up without a remount. Also fires on resume.
    pollWhileVisible(() => {
      if (!this.briefingRes.isLoading()) this.briefingRes.reload();
      if (!this.checksRes.isLoading()) this.checksRes.reload();
    }, SLOW_POLL_MS);

    // Sessions start and end on other surfaces (the timer page, the Chrome
    // extension), so the card can't assume it saw the transition. The service
    // swallows its own errors and holds prior state, so a failed poll is a
    // no-op rather than a card that flickers away. Live-status rides the same
    // minute: both answer "what's true right now".
    void this.focus.loadActive();
    pollWhileVisible(() => {
      void this.focus.loadActive();
      if (!this.liveRes.isLoading()) this.liveRes.reload();
    }, LIVE_STATUS_POLL_MS);
  }

  // ── Glance bar ──────────────────────────────────────────────────
  /** Today's food rows. The from/to filter is calendar-based server-side, so
   *  re-filter on the logical day the rest of the shell counts by. */
  private readonly todayFoods = computed<FoodLogEntry[]>(() => {
    if (!this.foodRes.hasValue()) return [];
    const today = this.today();
    return this.foodRes.value().items.filter((f) => logicalDay(f.logged_at) === today);
  });

  private readonly intakeKcal = computed<number | null>(() => {
    const foods = this.todayFoods();
    if (!foods.length) return null;
    return foods.reduce((sum, f) => sum + (f.est_kcal ?? 0), 0);
  });

  /** hasValue() before value(): value() throws in the error state. */
  private readonly live = computed<LiveStatus | null>(() =>
    this.liveRes.hasValue() ? this.liveRes.value() : null,
  );

  // steps stays `undefined` until live-status answers, and only becomes null if
  // the server itself has nothing — buildGlance renders those two differently
  // on purpose, so don't collapse them with a ?? here.
  protected readonly glance = computed(() => {
    const live = this.live();
    return buildGlance({
      day: this.today(),
      intakeKcal: this.intakeKcal(),
      steps: live?.today.steps,
      // The API's upcoming[].time is UTC; buildGlance counts down from
      // in_minutes instead, which has no zone to get wrong.
      upcoming: live?.upcoming,
    });
  });

  // ── Launcher ────────────────────────────────────────────────────
  // Only the two counts that mean "you specifically". vault_pulse.inbox_count
  // sits at 163 and blockers at 22 — either would be a badge that is always on,
  // which is a badge nobody reads.
  protected readonly tiles = computed(() =>
    applyBadges(SHORTCUT_TILES, {
      fleet: this.live()?.dispatch_pulse.waiting_on_marvin ?? 0,
      'close-day': this.checks().remaining,
    }),
  );

  // ── Attention row ───────────────────────────────────────────────
  protected readonly attention = computed(() =>
    buildAttention({
      waitingOnMarvin: this.live()?.dispatch_pulse.waiting_on_marvin,
      checksRemaining: this.checks().remaining,
      checksCostLabel: this.checks().costLabel,
      closeDayOnScreen: this.nowCard().kind === 'close-day',
    }),
  );

  // ── Quick log ───────────────────────────────────────────────────
  private readonly histogram = computed(() =>
    buildDaypartHistogram(this.historyRes.hasValue() ? this.historyRes.value().items : []),
  );

  protected readonly usuals = computed<Usual[]>(() =>
    rankUsualsForDaypart(
      buildUsuals(this.frequentRes.hasValue() ? this.frequentRes.value().items : [], {
        max: USUAL_CANDIDATES,
      }),
      this.histogram(),
      this.daypart(),
      GRID_SLOTS,
    ),
  );

  /** Times each usual has already been logged today — the ×n on its cell. */
  protected readonly usualTally = computed<ReadonlyMap<string, number>>(() =>
    tallyUsuals(this.todayFoods().map((f) => f.raw_text)),
  );

  protected readonly usualLogger = createUsualLogger({
    service: this.nutrition,
    toast: this.toast,
    haptics: this.haptics,
    onLogged: () => {
      this.foodRes.reload();
      this.frequentRes.reload();
    },
  });

  // ── The NOW card ────────────────────────────────────────────────
  // hasValue() before value(): value() *throws* in the error state, so `?.`
  // would not save this. A 404 (no briefing yet, no checks configured) reads
  // as an empty day rather than as a broken screen.
  protected readonly briefing = computed<BriefingAnalysis | null>(() =>
    this.briefingRes.hasValue() ? this.briefingRes.value() : null,
  );

  private readonly shape = computed(() => buildDayShape(this.briefing()?.analysis));

  private readonly checks = computed(() =>
    summariseChecks(this.checksRes.hasValue() ? this.checksRes.value().items : []),
  );

  /** The running session, reduced to what the card renders. */
  private readonly activeFocus = computed<ActiveFocus | null>(() => {
    const session = this.focus.active();
    if (!session) return null;
    return {
      startedAt: session.started_at,
      plannedSeconds: session.planned_seconds,
      notes: session.notes,
    };
  });

  /**
   * One card at a time, chosen state-first — see selectNowCard. Recomputed off
   * the minute clock, so the countdown ticks and the daypart tiebreak moves
   * with the day even though this tab is never re-created.
   */
  protected readonly nowCard = computed(() =>
    selectNowCard({
      now: this.now(),
      day: this.today(),
      focus: this.activeFocus(),
      checks: this.checks(),
      shape: this.shape(),
    }),
  );

  /** A complete is in flight — dims the action and drops the duplicate tap. */
  protected readonly completing = signal(false);

  /**
   * Pause and extend have no API today, so the card's buttons carry you to the
   * timer page where the session can be handled, rather than sitting greyed out
   * on a screen that won't say why.
   */
  protected openTimer(): void {
    void this.router.navigate(['/pomo/running']);
  }

  protected async completeFocus(): Promise<void> {
    const session = this.focus.active();
    if (!session || this.completing()) return;
    this.completing.set(true);
    this.haptics.tap();
    // The service toasts on both paths and swallows its own errors; a second
    // toast here would double up. Completing clears `active`, which is what
    // flips the card — no reload needed.
    await this.focus.complete(session.id);
    this.completing.set(false);
  }

  protected openCloseDay(): void {
    void this.router.navigate(['/evening']);
  }

  /** v3 insights, with the v1 surprise folded in as one more fact. */
  protected readonly insights = computed(() => {
    const a = this.briefing()?.analysis;
    if (!a) return [];
    const out = (a.insights ?? []).map((i) => i.fact);
    if (a.surprise) out.push(a.surprise.fact);
    return out.slice(0, 3);
  });

  protected readonly highlights = computed(
    () => (this.briefing()?.analysis.email_highlights ?? []).slice(0, 3),
  );

  // ── Mood/energy check-in ────────────────────────────────────────
  protected readonly mood = signal<number | null>(null);
  protected readonly energy = signal<number | null>(null);
  protected readonly saving = signal(false);

  protected readonly answeredToday = computed(() =>
    this.checkinsRes.hasValue()
      ? this.checkinsRes.value().items.filter((i) => i.state === 'answered' || i.mood !== null).length
      : 0,
  );

  protected save(): void {
    const mood = this.mood();
    const energy = this.energy();
    // Errors over disabled states: the button is always there and says what's
    // missing instead of hiding or greying out.
    if (mood === null || energy === null) {
      this.toast.info(
        mood === null && energy === null
          ? 'Pick a mood and an energy level first'
          : mood === null
            ? 'Pick a mood first'
            : 'Pick an energy level first',
      );
      return;
    }
    if (this.saving()) return;
    this.saving.set(true);
    this.haptics.tap();
    this.checkins.create({ source: 'dashboard', mood, energy }).subscribe({
      next: () => {
        this.saving.set(false);
        this.mood.set(null);
        this.energy.set(null);
        this.checkinsRes.reload();
        this.toast.success('Check-in logged');
      },
      error: () => {
        this.saving.set(false);
        this.toast.error('Could not log check-in');
      },
    });
  }
}
