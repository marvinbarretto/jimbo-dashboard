import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { type Usual } from '../../data-access/usuals';

/**
 * The "Usuals" chip row — frequent foods as one-tap log buttons, shared by the
 * phone shell's Log tab and the desktop nutrition day view.
 *
 * Purely presentational (VAULT-COMMANDS-001: no data-access imports here) —
 * hosts derive the inputs via buildUsuals/tallyUsuals and handle taps with
 * createUsualLogger, so the write flow and copy can't drift between surfaces.
 */
@Component({
  selector: 'app-usual-chips',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './usual-chips.html',
  styleUrl: './usual-chips.scss',
})
export class UsualChips {
  readonly usuals = input.required<readonly Usual[]>();
  /** Times each key was logged on the viewed day — the ×n badge. */
  readonly tally = input<ReadonlyMap<string, number>>(new Map());
  /** Keys with a POST in flight — dims the chip and drops re-taps upstream. */
  readonly pending = input<ReadonlySet<string>>(new Set());
  readonly tapped = output<Usual>();
}
