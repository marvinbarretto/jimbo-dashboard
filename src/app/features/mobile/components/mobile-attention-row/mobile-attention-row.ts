import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { type AttentionItem } from '../../utils/attention';

/**
 * The row of things waiting on Marvin — rendered only when it has something,
 * so a quiet day shows nothing rather than a reassuring zero.
 *
 * A `<nav>`, and deliberately **not** `aria-live`: the counts behind it refresh
 * every 60 seconds, and a live region would re-announce "20 waiting on you"
 * over whatever the user was actually reading, once a minute, forever.
 *
 * Rows are anchors for the same reason the launcher's tiles are — they
 * navigate, they never act — and each carries its own accessible name, because
 * "20 waiting on you" out of context is not one.
 *
 * Purely presentational (VAULT-COMMANDS-001: no data-access imports).
 */
@Component({
  selector: 'app-mobile-attention-row',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './mobile-attention-row.html',
  styleUrl: './mobile-attention-row.scss',
  host: { 'data-testid': 'mobile-attention-row' },
})
export class MobileAttentionRow {
  readonly items = input.required<readonly AttentionItem[]>();
}
