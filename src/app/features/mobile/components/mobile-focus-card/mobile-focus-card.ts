import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * The NOW card while a focus session is running — what's on, how long is left,
 * and the one action worth having under a thumb: finish it.
 *
 * Every value arrives pre-formatted from selectNowCard() so the countdown's
 * branches stay unit-tested; this component only places them.
 *
 * Pause and extend are here but not implementable in place — the session PATCH
 * payload has no `planned_seconds` and there is no pause endpoint — so they
 * emit and the container sends them to the timer page. Deliberately *not*
 * greyed out: a dead-looking button teaches you the screen is broken, whereas a
 * button that takes you where the thing can be done is just navigation. Same
 * reason `busy` dims Complete rather than disabling it; the container drops the
 * re-tap.
 *
 * Purely presentational (VAULT-COMMANDS-001: no data-access imports).
 */
@Component({
  selector: 'app-mobile-focus-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './mobile-focus-card.html',
  styleUrl: './mobile-focus-card.scss',
  host: { 'data-testid': 'mobile-focus-card' },
})
export class MobileFocusCard {
  /** The session's declared intention, or a generic fallback. */
  readonly title = input.required<string>();
  /** "18m left" / "3m over" — already formatted. */
  readonly remaining = input.required<string>();
  /** Elapsed share of the planned time, 0–100 and already clamped. */
  readonly percent = input.required<number>();
  /** A complete is in flight — dims the action, never disables it. */
  readonly busy = input<boolean>(false);
  /** False until the API grows planned_seconds on the session PATCH. */
  readonly canExtend = input<boolean>(false);

  readonly paused = output<void>();
  readonly extended = output<void>();
  readonly completed = output<void>();
}
