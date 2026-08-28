import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { withVaultDetailModal } from '@shared/kanban/detail-modal';
import { swapDetailSeq } from '@shared/kanban/detail-nav';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiPageHeader } from '@shared/components/ui-page-header/ui-page-header';
import { UiCard } from '@shared/components/ui-card/ui-card';
import { UiButton } from '@shared/components/ui-button/ui-button';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { ReviewCard } from '../../components/review-card/review-card';
import { UiStatCard } from '@shared/components/ui-stat-card/ui-stat-card';
import { UiProgressMeter } from '@shared/components/ui-progress-meter/ui-progress-meter';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { ReviewService, type HeldItem, type ReviewItem } from '../../data-access/review.service';

/** One bucket of the queue, named by the action it needs. */
interface ReviewGroup {
  key: 'answer' | 'check' | 'trust';
  title: string;
  meta: string;
  tone: 'alert' | 'default' | 'recede';
  items: ReviewItem[];
}

@Component({
  selector: 'app-review-board',
  imports: [
    UiStack, UiPageHeader, UiCard, UiButton, UiEmptyState,
    UiStatCard, UiProgressMeter, ReviewCard, UiSection,
  ],
  templateUrl: './review-board.html',
  styleUrl: './review-board.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // No `page-bleed`. That mode zeroes the shell's gutter for pages that own
  // their own edges — sidebar shells, kanban boards, edge-to-edge canvases.
  // This is a read-and-decide document page, so it wants the standard gutter
  // and to stay aligned with the header chrome above it.
})
export class ReviewBoard {
  private readonly service = inject(ReviewService);
  private readonly router = inject(Router);

  constructor() {
    // `?detail=<seq>` ↔ the vault-item modal. Approving is a judgement about a
    // vault item, and the card can only ever carry the agent's account of it —
    // this is the way through to the item's own body, thread and activity.
    withVaultDetailModal();
  }

  /** Open the vault item behind a card. */
  openItem(seq: string | null): void {
    const n = Number(seq);
    if (seq === null || Number.isNaN(n)) return;
    swapDetailSeq(this.router, n);
  }

  readonly items = this.service.items;
  readonly isLoading = this.service.isLoading;

  /**
   * The commission lane's brake, made visible.
   *
   * Unreviewed items occupy slots against the concurrency cap, so this queue
   * paces execution. Null when the gauge could not be read — the template shows
   * nothing rather than zeros, because an unmeasured queue must not read as an
   * idle one.
   */
  readonly pressure = this.service.pressure;

  /** Warn as the lane fills; alert once nothing new can start. */
  readonly capacityStatus = computed<'neutral' | 'warn' | 'alert'>(() => {
    const p = this.pressure();
    if (!p) return 'neutral';
    if (p.blocked) return 'alert';
    return p.slotsFree <= 2 ? 'warn' : 'neutral';
  });

  /**
   * Capacity headroom, phrased for the meter rather than for the "awaiting you"
   * count — free slots are a fact about the lane, not about Marvin, and reading
   * as a sub-label of his own queue made it sound like a personal target.
   * Null while there is comfortable headroom: a gauge that always shouts stops
   * being read.
   */
  readonly slotsDetail = computed(() => {
    const p = this.pressure();
    if (!p || p.blocked || p.slotsFree > 2) return null;
    const n = p.slotsFree;
    return `${n === 1 ? '1 slot' : `${n} slots`} free — new work stops when this fills`;
  });

  /**
   * Finished work deliberately kept off the list: red CI and standing anchors.
   * One tile, because from the operator's side they are the same fact — work
   * that is done, is not reviewable, and needs something other than a decision.
   */
  readonly heldTotal = computed(() => {
    const p = this.pressure();
    return p ? p.blockedOnCi + p.heldStanding : 0;
  });

  readonly heldReasons = computed(() => {
    const p = this.pressure();
    if (!p) return '';
    const parts: string[] = [];
    if (p.blockedOnCi > 0) parts.push(`${p.blockedOnCi} on red CI`);
    if (p.heldStanding > 0) parts.push(`${p.heldStanding} standing`);
    return parts.join(', ');
  });

  /**
   * What the meter's number is made of.
   *
   * The meter reads the lane (awaiting + running) and the tile beneath reads
   * the queue (awaiting). With nothing running those are the same figure twice
   * in the two loudest positions on the page, which reads as a redundancy
   * rather than as two different facts.
   */
  readonly splitLabel = computed(() => {
    const p = this.pressure();
    if (!p) return '';
    const running = Math.max(0, p.inFlight - p.awaiting);
    return `${p.awaiting} awaiting your review · ${running} running · ${p.cap} slot cap`;
  });

  /**
   * The queue, split by what each item actually asks of you.
   *
   * A flat list of ten cards with identical Approve / Send back buttons says
   * every row is the same decision, and they are not: one is a delivery the
   * agent declined to make, five have something you can open and check, and
   * four can only be approved on trust. Ordered mis-filed → checkable →
   * judgement, so the cheapest and most certain work comes before the work
   * that needs the most of you.
   */
  readonly groups = computed<ReviewGroup[]>(() => {
    const answer: ReviewItem[] = [];
    const check:  ReviewItem[] = [];
    const trust:  ReviewItem[] = [];

    for (const item of this.items()) {
      if (item.verification?.kind === 'declined') answer.push(item);
      else if (item.artifactUrl) check.push(item);
      else trust.push(item);
    }

    return ([
      {
        key: 'answer' as const,
        title: 'Not a delivery',
        meta: 'The agent reported it did not do the work. Neither button is an answer — open the item and settle what was being asked.',
        tone: 'alert' as const,
        items: answer,
      },
      {
        key: 'check' as const,
        title: 'Ready to check',
        meta: 'There is something to open. Read the artifact against the criteria, then approve or send back.',
        tone: 'default' as const,
        items: check,
      },
      {
        key: 'trust' as const,
        title: 'Nothing to open',
        meta: 'No artifact was linked. Approving these means taking the agent at its word — open the item for its thread and activity first.',
        tone: 'recede' as const,
        items: trust,
      },
    ]).filter(g => g.items.length > 0);
  });

  /**
   * Every report in the queue that has something to file.
   *
   * The queue has never had a bulk anything: ten items, one decision each,
   * and two thirds of them outputs rather than decisions. Filing them one at a
   * time is the same click repeated, which is exactly the work a person should
   * not be doing.
   */
  readonly fileableItems = computed(() => this.items().filter(i =>
    i.verification?.kind === 'report' && !!(i.artifactUrl ?? i.artifactRef),
  ));

  /** Confirm before a bulk disposal — it is cheap to click and not undoable. */
  readonly confirmingFileAll = signal(false);
  toggleConfirmFileAll(): void { this.confirmingFileAll.update(v => !v); }

  fileAll(): void {
    this.confirmingFileAll.set(false);
    for (const item of this.fileableItems()) this.service.file(item);
  }

  fileOutput(item: ReviewItem): void {
    this.service.file(item);
  }

  /** Re-run a dispatch whose PR went red. The only useful action on one. */
  retryHeld(held: HeldItem): void {
    this.service.retryHeld(held);
  }

  readonly waitStatus = computed<'neutral' | 'warn' | 'alert'>(() => {
    const days = this.pressure()?.oldestWaitDays ?? null;
    if (days === null) return 'neutral';
    if (days >= 30) return 'alert';
    return days >= 7 ? 'warn' : 'neutral';
  });

  refresh(): void {
    this.service.load();
  }

  approve(item: ReviewItem): void {
    this.service.approve(item);
  }

  /** The card owns the reason box now, so this just forwards a validated one. */
  sendBack(item: ReviewItem, reason: string): void {
    this.service.sendBack(item, reason);
  }
}
