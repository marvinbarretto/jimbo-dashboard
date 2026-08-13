import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { UiProgressMeter } from '@shared/components/ui-progress-meter/ui-progress-meter';

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
  /**
   * "Answer 7 checks" — arrives whole from selectNowCard rather than being
   * assembled here. It was built locally once, and the count-plus-pluralise
   * double-count that produced shipped straight to production, because a
   * formatting branch inside a component is a branch no test can reach.
   */
  readonly actionLabel = input.required<string>();

  readonly opened = output<void>();
}
