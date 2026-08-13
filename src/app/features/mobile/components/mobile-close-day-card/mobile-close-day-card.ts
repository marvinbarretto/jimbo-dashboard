import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { UiProgressMeter } from '@shared/components/ui-progress-meter/ui-progress-meter';
import { pluralise } from '@shared/utils/datetime.utils';

/**
 * The NOW card in the evening: the day's tick-list, and how little is left of it.
 *
 * Leads with the time cost rather than the outstanding count on purpose —
 * "3 left" is a nag, "~25s left" is an offer, and the whole reason the checks
 * are invisible on the phone today is that nothing ever made them look cheap.
 *
 * Purely presentational (VAULT-COMMANDS-001: no data-access imports).
 */
@Component({
  selector: 'app-mobile-close-day-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UiProgressMeter],
  templateUrl: './mobile-close-day-card.html',
  styleUrl: './mobile-close-day-card.scss',
  host: { 'data-testid': 'mobile-close-day-card' },
})
export class MobileCloseDayCard {
  /** The day being closed — "Thu 13 Aug". */
  readonly dayLabel = input.required<string>();
  readonly answered = input.required<number>();
  readonly total = input.required<number>();
  /** "~25s left" — pre-formatted so the estimate stays unit-tested. */
  readonly costLabel = input.required<string>();

  readonly opened = output<void>();

  protected readonly remaining = computed(() => Math.max(0, this.total() - this.answered()));

  protected readonly actionLabel = computed(() => {
    const left = this.remaining();
    return `Answer ${left} ${pluralise(left, 'check')}`;
  });
}
