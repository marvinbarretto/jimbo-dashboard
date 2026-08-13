import { HttpErrorResponse, httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { UiButton } from '@shared/components/ui-button/ui-button';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import { UiScorePicker } from '@shared/components/ui-score-picker/ui-score-picker';
import { ToastService } from '@shared/components/toast/toast.service';
import { formatLondonTime, logicalDay, shiftIsoDay } from '@shared/utils/datetime.utils';
import { daypartAt } from '@shared/utils/daypart';
import { injectHaptics } from '@shared/utils/haptics';
import { pollWhileVisible } from '@features/journal/utils/live-poll';
import { CheckinsService } from '@features/checkins/data-access/checkins.service';
import { type BriefingAnalysis } from '@features/briefings/data-access/briefing.types';
import { MOOD_LABELS, ENERGY_LABELS, type MoodLogEntry } from '@domain/checkins';
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
import { injectLogicalToday } from '../../utils/logical-today';
import { injectMinuteClock } from '../../utils/minute-clock';
import { buildGlance } from '../../utils/glance';
import { SHORTCUT_TILES, applyBadges } from '../../utils/shortcut-tiles';
import { MobileGlanceBar } from '../../components/mobile-glance-bar/mobile-glance-bar';
import { MobileShortcutLauncher } from '../../components/mobile-shortcut-launcher/mobile-shortcut-launcher';

/** One rendered plan line — v2 priorities and v1 day_plan normalise to this. */
type PlanLine = { lead: string; text: string };

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
    UiButton,
    UiEmptyState,
    UiLoadingState,
    UiScorePicker,
    MobileGlanceBar,
    MobileShortcutLauncher,
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

  constructor() {
    // The briefing lands mid-morning and /latest 404s before it; a parked tab
    // must pick it up without a remount. Also fires on resume.
    pollWhileVisible(() => {
      if (!this.briefingRes.isLoading()) this.briefingRes.reload();
    }, 5 * 60_000);
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

  // Steps and the next calendar event arrive with live-status in a later slice;
  // omitted rather than faked, and buildGlance renders the shorter line.
  protected readonly glance = computed(() =>
    buildGlance({ day: this.today(), intakeKcal: this.intakeKcal() }),
  );

  // ── Launcher ────────────────────────────────────────────────────
  // Badge counts come from live-status in a later slice; every tile is quiet
  // until then, which is the correct rendering for "nothing is waiting".
  protected readonly tiles = computed(() => applyBadges(SHORTCUT_TILES, {}));

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

  // ── Briefing ────────────────────────────────────────────────────
  protected readonly briefingLoading = computed(
    () => this.briefingRes.isLoading() && !this.briefingRes.hasValue(),
  );

  /** 404 = no briefing in the server's freshness window — empty, not broken. */
  protected readonly briefingMissing = computed(() => {
    const err = this.briefingRes.error();
    return err instanceof HttpErrorResponse && err.status === 404;
  });

  protected readonly briefingFailed = computed(
    () => this.briefingRes.error() !== undefined && !this.briefingMissing(),
  );

  protected retryBriefing(): void {
    this.briefingRes.reload();
  }

  protected readonly briefing = computed<BriefingAnalysis | null>(() =>
    this.briefingRes.hasValue() ? this.briefingRes.value() : null,
  );

  protected readonly generatedAt = computed(() => {
    const b = this.briefing();
    return b ? formatLondonTime(b.generated_at) : '';
  });

  /**
   * v2 briefings carry priorities and null out the v1 day_plan; older rows are
   * the reverse. Normalise both so the section renders whatever the API returns.
   */
  protected readonly plan = computed<PlanLine[]>(() => {
    const a = this.briefing()?.analysis;
    if (!a) return [];
    const priorities = (a.priorities ?? []).map((p) => ({
      lead: p.fixed_time ?? (p.deadline ? `by ${p.deadline}` : p.constraint),
      text: p.title,
    }));
    if (priorities.length) return priorities;
    return a.day_plan.map((d) => ({ lead: d.time, text: d.suggestion }));
  });

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
