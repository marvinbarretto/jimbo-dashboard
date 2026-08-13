import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { type ShapeBlock } from '@features/briefings/utils/day-shape';

/**
 * The NOW card in the morning: how the day is meant to go.
 *
 * Read-only, and that is a decision rather than an omission. The wireframe's
 * "Looks right ✓" has no endpoint behind it — nothing server-side records that
 * a plan was accepted — and a tick that only writes to localStorage would look
 * like agreement the briefing never hears about. It reads until there's
 * somewhere for the answer to go.
 *
 * Blocks arrive already normalised by buildDayShape(), so this renders one list
 * regardless of which briefing schema produced it.
 *
 * Purely presentational (VAULT-COMMANDS-001: no data-access imports).
 */
@Component({
  selector: 'app-mobile-shape-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './mobile-shape-card.html',
  styleUrl: './mobile-shape-card.scss',
  host: { 'data-testid': 'mobile-shape-card' },
})
export class MobileShapeCard {
  readonly blocks = input.required<readonly ShapeBlock[]>();
  readonly heading = input<string>("Today's shape");
}
