import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { UiButton } from '@shared/components/ui-button/ui-button';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import { UiScorePicker } from '@shared/components/ui-score-picker/ui-score-picker';
import { ToastService } from '@shared/components/toast/toast.service';
import { logicalDay } from '@shared/utils/datetime.utils';
import { CheckinsService } from '@features/checkins/data-access/checkins.service';
import { MOOD_LABELS, ENERGY_LABELS, type MoodLogEntry } from '@domain/checkins';
import { injectLogicalToday } from '../../utils/logical-today';
import { injectHaptics } from '../../utils/haptics';

/** The slice of BriefingAnalysis the phone renders. */
type BriefingLatest = {
  id: number;
  generated_at: string;
  analysis: {
    day_plan?: { time: string; suggestion: string; source: string; reasoning: string }[];
    email_highlights?: { source: string; headline: string; editorial: string; links: string[] }[];
    surprise?: { fact: string; strategy: string } | null;
  };
};

/**
 * Today tab — the morning glance: Boris's day plan and a two-tap mood/energy
 * check-in. Deliberately not the full briefing report (that stays on the
 * desktop briefing pages) — this is what's worth a phone screen at 7am, and
 * the deep-link target for the native home's briefing tile.
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

  private readonly briefingRes = httpResource<BriefingLatest>(() => `/api/briefing/latest`);
  private readonly checkinsRes = httpResource<{ items: MoodLogEntry[] }>(
    () => `/api/checkins?date=${this.today()}&limit=20`,
  );

  protected readonly loading = computed(
    () => this.briefingRes.isLoading() && !this.briefingRes.hasValue(),
  );

  protected readonly briefing = computed<BriefingLatest | null>(() =>
    this.briefingRes.hasValue() ? this.briefingRes.value() : null,
  );

  protected readonly dayPlan = computed(() => this.briefing()?.analysis.day_plan ?? []);
  protected readonly highlights = computed(
    () => (this.briefing()?.analysis.email_highlights ?? []).slice(0, 3),
  );
  protected readonly surprise = computed(() => this.briefing()?.analysis.surprise ?? null);

  /** A briefing generated before today's logical day is shown, but labelled. */
  protected readonly briefingIsStale = computed(() => {
    const b = this.briefing();
    return b !== null && logicalDay(b.generated_at) !== this.today();
  });

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
    // Errors over disabled states: the button stays tappable and says what's
    // missing instead of greying out.
    if (mood === null || energy === null) {
      this.toast.info(mood === null ? 'Pick a mood first' : 'Pick an energy level first');
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
