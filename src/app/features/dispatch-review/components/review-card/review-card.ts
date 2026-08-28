import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { UiButton } from '@shared/components/ui-button/ui-button';
import { UiProse } from '@shared/components/ui-prose/ui-prose';
import { relativeTime } from '@shared/utils/datetime.utils';
import type { ReviewCriterion, ReviewItem } from '../../data-access/review.service';

/** How a criterion was left, at the granularity the reader actually needs. */
export type CheckState = 'met' | 'failed' | 'your_read' | 'not_checked';

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
  /** Carries the reason — sending work back without one is just a rejection. */
  readonly sendBack = output<string>();
  readonly openItem = output<void>();

  /**
   * Whether the send-back reason box is open.
   *
   * Was a `window.prompt`, which put the one moment that needs the criteria in
   * front of you behind a modal that covers them — and a native prompt cannot
   * show the brief it is asking you to reject against.
   */
  readonly rejecting = signal(false);

  toggleRejecting(): void { this.rejecting.update(v => !v); }

  submitSendBack(reason: string): void {
    const trimmed = reason.trim();
    if (!trimmed) return;
    this.rejecting.set(false);
    this.sendBack.emit(trimmed);
  }

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
   * How long this has been sitting, and loud once that is embarrassing.
   *
   * The board banner reported a 68-day longest wait above a list where no card
   * said its own age, so the one item the banner was about could not be found.
   */
  readonly waited = computed(() => {
    const at = this.item().completedAt;
    return at ? relativeTime(at) : null;
  });

  readonly waitTone = computed<'stale' | 'old' | null>(() => {
    const at = this.item().completedAt;
    if (!at) return null;
    const days = (Date.now() - Date.parse(at)) / 86_400_000;
    if (Number.isNaN(days)) return null;
    if (days >= 30) return 'stale';
    return days >= 7 ? 'old' : null;
  });

  /**
   * The agent reported it did NOT do the work.
   *
   * The verifier already recognises this and routes it to `question`, but
   * nothing consumes that routing yet — so seq 2860, whose summary opens "the
   * vault note I fetched is not a research task", arrived shaped exactly like a
   * finished deliverable with Approve beneath it. Neither button on this card
   * is an answer to it, and the card has to say so.
   */
  readonly declined = computed(() => this.item().verification?.kind === 'declined');

  /** The verifier never ran. Different from running and settling nothing. */
  readonly unverified = computed(() => this.item().verification === null);

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

  /** "Branch" / "Commit" — named by the agent, but not something we can open. */
  readonly refLabel = computed(() =>
    this.item().artifactSource === 'branch' ? 'Branch' : 'Commit',
  );

  /**
   * Four states, not three.
   *
   * Every criterion in the live queue came back `unverifiable`, which rendered
   * as one identical empty box 29 times over. But the payload already separates
   * two unrelated situations: a subjective criterion no machine can ever settle
   * (correctly and permanently yours), and a mechanical one the verifier could
   * not reach (a gap in the verifier, not in the work). Collapsing them lost
   * the only information the section had.
   */
  state(c: ReviewCriterion): CheckState {
    if (c.verdict === 'met') return 'met';
    if (c.verdict === 'not_met') return 'failed';
    return c.kind === 'subjective' ? 'your_read' : 'not_checked';
  }

  /** An unchecked box must never look like a passed one. */
  mark(c: ReviewCriterion): string {
    switch (this.state(c)) {
      case 'met':         return '✓';
      case 'failed':      return '✗';
      case 'your_read':   return '☐';
      case 'not_checked': return '?';
    }
  }

  /** The same states in words, for anyone not reading the glyph. */
  spoken(c: ReviewCriterion): string {
    switch (this.state(c)) {
      case 'met':         return 'verified';
      case 'failed':      return 'failed';
      case 'your_read':   return 'your read — no machine check exists';
      case 'not_checked': return 'not checked';
    }
  }

  readonly seqLabel = computed(() => {
    const seq = this.item().seq;
    return seq ? `#${seq}` : '—';
  });
}
