import { HttpErrorResponse, httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { UiButton } from '@shared/components/ui-button/ui-button';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import { UiScorePicker } from '@shared/components/ui-score-picker/ui-score-picker';
import { ToastService } from '@shared/components/toast/toast.service';
import { formatLondonTime } from '@shared/utils/datetime.utils';
import { pollWhileVisible } from '@features/journal/utils/live-poll';
import { CheckinsService } from '@features/checkins/data-access/checkins.service';
import { type BriefingAnalysis } from '@features/briefings/data-access/briefing.types';
import { MOOD_LABELS, ENERGY_LABELS, type MoodLogEntry } from '@domain/checkins';
import { injectLogicalToday } from '../../utils/logical-today';
import { injectHaptics } from '@shared/utils/haptics';

/** One rendered plan line — v2 priorities and v1 day_plan normalise to this. */
type PlanLine = { lead: string; text: string };

/**
 * Today tab — the morning glance: the briefing's priorities and a two-tap
 * mood/energy check-in. Deliberately not the full briefing report (that stays
 * on the desktop briefing pages) — this is what's worth a phone screen at
 * 7am, and the deep-link target for the native home's briefing tile.
 *
 * The two sections gate independently: the check-in is the tab's only input
 * and must never sit behind a briefing fetch that may 404 all pre-dawn.
 */
@Component({
  selector: 'app-mobile-today',
  imports: [UiButton, UiEmptyState, UiLoadingState, UiScorePicker],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './mobile-today.html',
  styleUrl: './mobile-today.scss',
})
export class MobileToday {
  private readonly checkins = inject(CheckinsService);
  private readonly toast = inject(ToastService);
  private readonly haptics = injectHaptics();

  protected readonly today = injectLogicalToday();
  protected readonly moodLabels = MOOD_LABELS;
  protected readonly energyLabels = ENERGY_LABELS;

  private readonly briefingRes = httpResource<BriefingAnalysis>(() => `/api/briefing/latest`);
  private readonly checkinsRes = httpResource<{ items: MoodLogEntry[] }>(
    () => `/api/checkins?date=${this.today()}&limit=20`,
  );

  constructor() {
    // The briefing lands mid-morning and /latest 404s before it; a parked tab
    // must pick it up without a remount. Five-minute visible-only poll — also
    // fires on resume, which covers the day rollover the checkins URL handles
    // via today() but a constant URL cannot.
    pollWhileVisible(() => {
      if (!this.briefingRes.isLoading()) this.briefingRes.reload();
    }, 5 * 60_000);
  }

  // ── Briefing section ────────────────────────────────────────────
  protected readonly briefingLoading = computed(
    () => this.briefingRes.isLoading() && !this.briefingRes.hasValue(),
  );

  /** 404 = no briefing in the server's freshness window — an empty state, not a failure. */
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
   * v2 briefings carry priorities and null out the v1 day_plan; older rows
   * are the reverse. Normalise both into one list so the section renders
   * whatever generation the API returns.
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
