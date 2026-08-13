import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { type Usual } from '../../data-access/usuals';

/**
 * The quick-log grid — frequent foods as one-tap cards, sized for a thumb.
 *
 * A sibling of UsualChips rather than a layout variant of it: this one carries
 * macros on a second line and ends in a navigation cell, and folding a link
 * into a component whose only output is `tapped: Usual` would put "go
 * somewhere" behind the same affordance as "record something". The derivation
 * (buildUsuals/tallyUsuals) and the write (createUsualLogger) are shared, which
 * is the half that matters; only the markup differs.
 *
 * Purely presentational (VAULT-COMMANDS-001: no data-access service imports).
 */
@Component({
  selector: 'app-usual-grid',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './usual-grid.html',
  styleUrl: './usual-grid.scss',
  host: { 'data-testid': 'usual-grid' },
})
export class UsualGrid {
  readonly usuals = input.required<readonly Usual[]>();
  /** Times each key was logged on the viewed day — the ×n badge. */
  readonly tally = input<ReadonlyMap<string, number>>(new Map());
  /** Keys with a POST in flight — dims the cell and drops re-taps upstream. */
  readonly pending = input<ReadonlySet<string>>(new Set());
  readonly heading = input<string>('Quick log');
  /** Route for the trailing "more" cell. Omit to drop the cell entirely. */
  readonly moreLink = input<string | null>(null);
  readonly moreLabel = input<string>('more');
  readonly tapped = output<Usual>();
}
