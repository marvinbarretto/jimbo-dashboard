import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CURRENT_ACTOR_ID } from '@domain/actors';
import { mergeAwaitingRows, type AwaitingRow, type Handback } from '@domain/awaiting';
import type { CreateThreadMessagePayload } from '@domain/thread';
import type { VaultItemId } from '@domain/ids';
import { ActorsService } from '@features/actors/data-access/actors.service';
import { AwaitingService } from '@features/awaiting/data-access/awaiting.service';
import { QuestionCard } from '@features/questions/components/question-card/question-card';
import { ThreadCommands } from '@features/thread/commands/thread-commands';
import { VaultItemCommands } from '@features/vault-items/commands/vault-item-commands';
import { EntityChip } from '@shared/components/entity-chip/entity-chip';
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
  imports: [QuestionCard, EntityChip, RouterLink],
  templateUrl: './awaiting-strip.html',
  styleUrl: './awaiting-strip.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AwaitingStrip {
  private readonly awaiting = inject(AwaitingService);
  private readonly threadCommands = inject(ThreadCommands);
  private readonly vaultCommands = inject(VaultItemCommands);
  private readonly actorsService = inject(ActorsService);

  readonly windowOptions = WINDOW_OPTIONS;
  readonly windowDays = this.awaiting.windowDays;
  readonly counts = this.awaiting.counts;
  readonly loading = this.awaiting.loading;
  readonly loaded = this.awaiting.loaded;

  readonly collapsed = signal(false);
  /** Which handback's "give it back" confirm is open. */
  readonly returning = signal<VaultItemId | null>(null);

  constructor() {
    this.awaiting.load(CURRENT_ACTOR_ID);
  }

  readonly rows = computed<AwaitingRow[]>(
    () => mergeAwaitingRows(this.awaiting.handbacks(), this.awaiting.questions()),
  );

  /**
   * The headline number. Questions and handbacks are counted separately by the
   * server and can overlap on one note — a handback raised BECAUSE of a pending
   * question is both. Summing them would double-count, so the headline is the
   * row count the strip can actually show, with the breakdown beside it.
   */
  readonly visibleCount = computed(() => this.rows().length);

  /** Live handbacks the window is hiding. Stated, never silently dropped. */
  readonly olderCount = computed(() => this.counts().older);

  readonly hasAnything = computed(() => this.visibleCount() > 0 || this.olderCount() > 0);

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
  returnToAgent(h: Handback): void {
    this.vaultCommands.reassign(h.note_id, h.from_actor, 'returned by the operator from the awaiting strip');
    this.awaiting.dismiss(h.note_id);
    this.returning.set(null);
  }
}
