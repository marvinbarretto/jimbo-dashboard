import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { UiButton } from '@shared/components/ui-button/ui-button';
import { UiProse } from '@shared/components/ui-prose/ui-prose';
import { CardParentLink } from '@shared/components/card-parent-link/card-parent-link';
import { EntityChip } from '@shared/components/entity-chip/entity-chip';
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
  imports: [UiBadge, UiButton, UiProse, CardParentLink, EntityChip],
  templateUrl: './review-card.html',
  styleUrl: './review-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'data-testid': 'review-card',
    // Feeds card-parent-link and the card's own edge band, the same way the
    // vault modal tints its header — so a queue of ten reads as four projects
    // at a glance instead of ten undifferentiated boxes.
    '[style.--proj-tint]': 'item().project?.colorToken ?? null',
  },
})
export class ReviewCard {
  readonly item = input.required<ReviewItem>();

  readonly approve = output<void>();
  readonly fileOutput = output<void>();
  readonly bin = output<void>();
  /** Carries the reason — sending work back without one is just a rejection. */
  readonly sendBack = output<string>();
  readonly openItem = output<void>();
  /** Open the EPIC, to give it the Why it is missing. */
  readonly openEpic = output<void>();

  /**
   * Whether the send-back reason box is open.
   *
   * Was a `window.prompt`, which put the one moment that needs the criteria in
   * front of you behind a modal that covers them — and a native prompt cannot
   * show the brief it is asking you to reject against.
   */
  readonly rejecting = signal(false);

  toggleRejecting(): void { this.rejecting.update(v => !v); }

  /**
   * Binning is one click from a scroll, so it asks once. Archiving is
   * reversible, but a card silently vanishing under the cursor is not the way
   * to find that out.
   */
  readonly confirmingBin = signal(false);
  toggleConfirmBin(): void { this.confirmingBin.update(v => !v); }
  confirmBin(): void { this.confirmingBin.set(false); this.bin.emit(); }

  /**
   * Long summaries are clamped until asked for.
   *
   * A declined delivery's summary is a full argument — seq 2860 runs to
   * numbered options and pushes every other card off the screen. The prose is
   * worth reading once you are on that item; it is not worth scrolling past
   * nine times to reach the rest of the queue.
   */
  readonly summaryExpanded = signal(false);

  /** Past this, the summary is an essay rather than a line. */
  private static readonly CLAMP_OVER = 320;

  readonly summaryClamped = computed(() =>
    !this.summaryExpanded() && (this.item().resultSummary?.length ?? 0) > ReviewCard.CLAMP_OVER,
  );

  readonly canExpandSummary = computed(() =>
    (this.item().resultSummary?.length ?? 0) > ReviewCard.CLAMP_OVER,
  );

  toggleSummary(): void { this.summaryExpanded.update(v => !v); }

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

  /**
   * An output to put away, not a deliverable to certify.
   *
   * `report` is the verifier's fallback kind — no PR, no doc, not a refusal —
   * and two thirds of the queue is it. Filing is the honest disposal: same
   * terminal state, logged as filed rather than approved, no claim that the
   * acceptance criteria were met. Offered only when something exists to file;
   * a report with no artifact at all is a different problem.
   */
  readonly fileable = computed(() =>
    this.item().verification?.kind === 'report'
    && !!(this.item().artifactUrl ?? this.item().artifactRef),
  );

  /** The verifier never ran. Different from running and settling nothing. */
  readonly unverified = computed(() => this.item().verification === null);

  /**
   * Which action this card actually leads with.
   *
   * Approve was the primary button on every row regardless of state, which
   * made the fastest path through the queue the one that rubber-stamps it —
   * on a gate whose whole job is to not be a rubber stamp. It stays primary
   * only where there is something to check first:
   *
   *   'open'    the agent declined, or there is nothing linked to look at, so
   *             the honest next step is the item itself
   *   'approve' an artifact exists and has been put in front of you
   */
  readonly primaryAction = computed<'approve' | 'open'>(() => {
    if (this.declined()) return 'open';
    return this.item().artifactUrl ? 'approve' : 'open';
  });

  /** Says what opening is FOR, which differs by why we're sending you there. */
  readonly openLabel = computed(() => {
    if (this.declined()) return 'Open and settle';
    return this.item().artifactUrl ? 'Open item for context' : 'Open item to judge';
  });

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

  /** Screenshots first — they are the reason this section exists. */
  readonly shots = computed(() => this.item().artifacts.filter(a => a.kind === 'image'));
  readonly otherArtifacts = computed(() => this.item().artifacts.filter(a => a.kind !== 'image'));

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

  /**
   * Why this line of work exists, from the epic that owns it.
   *
   * Was the PROJECT's intent, which answered a question Marvin never asks — he
   * always knows what a project is for. The uncertainty is one level down: does
   * THIS feature help, who for, how would we tell. Null here is not a blank to
   * be filled with something else; it is the finding.
   */
  readonly why = computed(() => this.item().epic?.why ?? null);

  /** card-parent-link takes a number; the wire carries seq as a string. */
  readonly epicSeq = computed(() => {
    const raw = this.item().epic?.seq;
    if (!raw) return null;
    const n = Number(raw);
    return Number.isNaN(n) ? null : n;
  });

  /** Open by default only where the reader is least equipped to decide. */
  readonly whyOpen = signal(false);
  toggleWhy(): void { this.whyOpen.update(v => !v); }

  readonly seqLabel = computed(() => {
    const seq = this.item().seq;
    return seq ? `#${seq}` : '—';
  });
}
