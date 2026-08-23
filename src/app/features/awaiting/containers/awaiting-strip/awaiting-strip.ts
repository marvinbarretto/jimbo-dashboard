import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CURRENT_ACTOR_ID } from '@domain/actors';
import { mergeAwaitingRows, type AwaitingRow, type Handback, type ReviewWaiting } from '@domain/awaiting';
import type { CreateThreadMessagePayload } from '@domain/thread';
import type { VaultItemId } from '@domain/ids';
import { ActorsService } from '@features/actors/data-access/actors.service';
import { AwaitingService } from '@features/awaiting/data-access/awaiting.service';
import { QuestionCard } from '@features/questions/components/question-card/question-card';
import { ThreadCommands } from '@features/thread/commands/thread-commands';
import { ReviewService, type ReviewItem } from '@features/dispatch-review/data-access/review.service';
import { VaultItemCommands } from '@features/vault-items/commands/vault-item-commands';
import { EntityChip } from '@shared/components/entity-chip/entity-chip';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { CardCallout } from '@shared/components/card-callout/card-callout';
import { relativeTime } from '@shared/utils/datetime.utils';

interface WindowOption { readonly label: string; readonly days: number | null }

const WINDOW_OPTIONS: readonly WindowOption[] = [
  { label: '24h',   days: 1 },
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: 'all',   days: null },
];

/**
 * The one thing the operator is watching for: what an agent handed back and is
 * now stalled behind.
 *
 * Pinned above the lanes because the whole defect it addresses is invisibility
 * — these items are already IN the Ready lane, indistinguishable from the
 * hundreds Marvin captured himself. See
 * docs/plans/2026-08-14-operator-in-the-loop-kanban.md (step 1).
 */
@Component({
  selector: 'app-awaiting-strip',
  imports: [QuestionCard, EntityChip, RouterLink, UiBadge, CardCallout],
  templateUrl: './awaiting-strip.html',
  styleUrl: './awaiting-strip.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AwaitingStrip {
  private readonly awaiting = inject(AwaitingService);
  private readonly threadCommands = inject(ThreadCommands);
  private readonly vaultCommands = inject(VaultItemCommands);
  private readonly actorsService = inject(ActorsService);
  // The review queue already has a service with approve / send-back and
  // optimistic removal — reused wholesale rather than reimplemented, so the
  // strip and the /review page can never disagree about what is outstanding.
  private readonly reviewService = inject(ReviewService);

  readonly windowOptions = WINDOW_OPTIONS;
  readonly windowDays = this.awaiting.windowDays;
  readonly counts = this.awaiting.counts;
  readonly loading = this.awaiting.loading;
  readonly loaded = this.awaiting.loaded;

  readonly collapsed = signal(false);
  /** Which handback's "give it back" confirm is open. */
  readonly returning = signal<VaultItemId | null>(null);
  /** Which review row has its send-back reason box open. */
  readonly rejecting = signal<string | null>(null);

  constructor() {
    this.awaiting.load(CURRENT_ACTOR_ID);
  }

  /** ReviewItem -> the framework-free domain shape the merge understands. */
  private readonly reviewsWaiting = computed<ReviewWaiting[]>(
    () => this.reviewService.items().map(r => ({
      id: r.noteId, seq: r.seq, title: r.title, skill: r.skill,
      summary: r.resultSummary, prUrl: r.prUrl, prState: r.prState,
      completedAt: r.completedAt,
    })),
  );

  readonly rows = computed<AwaitingRow[]>(
    () => mergeAwaitingRows(this.awaiting.handbacks(), this.awaiting.questions(), this.reviewsWaiting()),
  );

  /**
   * The headline number, and it must equal the breakdown beside it. The server
   * guarantees the two sets are disjoint (a question-bearing note surfaces as a
   * question, never also as a handback), so the sum is exact.
   *
   * Deliberately NOT `rows().length` — that is the PAGE, which the limit
   * truncates, and a headline that silently shrinks to the page size is the
   * "unmeasured zero reads as an idle zero" failure in miniature.
   */
  readonly waitingCount = computed(
    () => this.counts().questions + this.counts().handbacks + this.reviewsWaiting().length,
  );

  /** How many of them are actually rendered. Drives the "showing newest N" note. */
  readonly shownCount = computed(() => this.rows().length);

  readonly truncated = computed(() => this.shownCount() < this.waitingCount());

  /** Finished work awaiting acceptance. */
  readonly reviewCount = computed(() => this.reviewsWaiting().length);

  /** Live handbacks the window is hiding. Stated, never silently dropped. */
  readonly olderCount = computed(() => this.counts().older);

  readonly hasAnything = computed(() => this.waitingCount() > 0 || this.olderCount() > 0);

  /**
   * What this strip is NOT showing, as one sentence. Both facts previously
   * rendered as bare adjacent spans, so "showing newest 69" followed by "979
   * older than the window" read as a single number, 69979.
   */
  readonly coverageNote = computed<string | null>(() => {
    const parts: string[] = [];
    if (this.truncated()) parts.push(`showing the newest ${this.shownCount()}`);
    if (this.olderCount() > 0) {
      const n = this.olderCount();
      parts.push(`${n} handback${n === 1 ? '' : 's'} older than the window`);
    }
    return parts.length ? parts.join(' · ') : null;
  });

  agentLabel(id: string): string {
    return this.actorsService.getById(id as never)?.display_name ?? id;
  }

  ageLabel(iso: string): string { return relativeTime(iso); }

  priorityLabel(p: number | null): string { return p === null ? '—' : `P${p}`; }

  setWindow(days: number | null): void {
    this.awaiting.setWindowDays(days, CURRENT_ACTOR_ID);
  }

  refresh(): void { this.awaiting.load(CURRENT_ACTOR_ID); }

  onAnswered(payload: CreateThreadMessagePayload): void {
    // ThreadCommands owns the cross-store update, including this strip's copy.
    this.threadCommands.answerQuestion(payload);
  }

  toggleReturn(noteId: VaultItemId): void {
    this.returning.update(cur => (cur === noteId ? null : noteId));
  }

  /**
   * The unblock path for a handback that carries no question: give it straight
   * back to the agent that was waiting. Until step 3 lands a real transient
   * "blocked on" state, reassignment IS the round-trip.
   */
  /** Accept finished work — the note goes done and a commission slot frees. */
  approveReview(r: ReviewWaiting): void {
    const item = this.reviewService.items().find(i => i.noteId === r.id);
    if (item) this.reviewService.approve(item);
  }

  /** Send it back for rework, with the reason the agent will read. */
  sendBackReview(r: ReviewWaiting, reason: string): void {
    const item = this.reviewService.items().find(i => i.noteId === r.id);
    if (item) this.reviewService.sendBack(item, reason);
    this.rejecting.set(null);
  }

  toggleReject(id: string): void {
    this.rejecting.update(cur => (cur === id ? null : id));
  }

  returnToAgent(h: Handback): void {
    this.vaultCommands.reassign(h.note_id, h.from_actor, 'returned by the operator from the awaiting strip');
    this.awaiting.dismiss(h.note_id);
    this.returning.set(null);
  }
}
