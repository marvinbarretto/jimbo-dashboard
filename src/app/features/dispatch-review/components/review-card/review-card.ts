import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { UiButton } from '@shared/components/ui-button/ui-button';
import { UiProse } from '@shared/components/ui-prose/ui-prose';
import type { ReviewItem } from '../../data-access/review.service';

/**
 * One decision in the review queue.
 *
 * Split out of the board because this is not a generic card: it carries a
 * specific argument in a specific order — what was asked for, what the agent
 * claims it did, and the artifact that settles which is true. A `ui-card` with
 * ad-hoc children made that order incidental rather than designed, and left the
 * deliverable buried in prose.
 */
@Component({
  selector: 'app-review-card',
  imports: [UiBadge, UiButton, UiProse],
  templateUrl: './review-card.html',
  styleUrl: './review-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'data-testid': 'review-card' },
})
export class ReviewCard {
  readonly item = input.required<ReviewItem>();

  readonly approve = output<void>();
  readonly sendBack = output<void>();
  readonly openItem = output<void>();

  /**
   * "#628 in localshout-next" from the PR url, so the button says which PR it
   * opens rather than a bare "view PR". Falls back to the raw url if GitHub
   * ever changes shape — a wrong label would be worse than a plain one.
   */
  readonly prLabel = computed(() => {
    const url = this.item().prUrl;
    if (!url) return null;
    const m = /github\.com\/[^/]+\/([^/]+)\/pull\/(\d+)/.exec(url);
    return m ? `#${m[2]} in ${m[1]}` : 'pull request';
  });

  /** The agent's own name for the "says" heading — never a bare "agent". */
  readonly agent = computed(() => this.item().assignedTo ?? 'The agent');

  /**
   * A PR is the deliverable; a summary-derived URL is only a link the agent
   * mentioned, which may be a source it read rather than a thing it made. The
   * label carries that difference so the card never overstates what it found.
   */
  readonly artifactLabel = computed(() =>
    this.item().artifactSource === 'pr' ? 'Open pull request' : 'Open link from summary',
  );

  /** The PR's own name where we have one, otherwise the bare host. */
  readonly artifactDetail = computed(() => {
    if (this.item().artifactSource === 'pr') return this.prLabel() ?? 'pull request';
    const url = this.item().artifactUrl;
    if (!url) return '';
    // A hostname is honest about what the reader is about to open; the full URL
    // is unreadable at card width and the path rarely says more than the host.
    const m = /^https?:\/\/([^/]+)/.exec(url);
    return m ? m[1] : url;
  });

  /**
   * Ticked when the verifier settled it, crossed when it actively failed, and
   * an empty box when nobody has checked — which is a job for the reader, not a
   * failure. An unchecked box must never look like a passed one.
   */
  mark(verdict: string): string {
    if (verdict === 'met') return '✓';
    if (verdict === 'not_met') return '✗';
    return '☐';
  }

  /** The same three states in words, for anyone not reading the glyph. */
  spoken(verdict: string): string {
    if (verdict === 'met') return 'verified';
    if (verdict === 'not_met') return 'failed';
    return 'needs your check';
  }

  readonly seqLabel = computed(() => {
    const seq = this.item().seq;
    return seq ? `#${seq}` : '—';
  });
}
