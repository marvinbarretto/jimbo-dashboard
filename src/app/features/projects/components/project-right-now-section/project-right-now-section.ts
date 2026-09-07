import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { VaultChip } from '@shared/components/vault-chip/vault-chip';
import { RelativeTimePipe } from '@shared/pipes/relative-time.pipe';
import type { VaultItem } from '@domain/vault/vault-item';

/** A row of `/api/dispatch/queue`. Only the fields this panel renders. */
export interface DispatchTask {
  id: number;
  task_id: string;
  task_title: string | null;
  task_seq: number | null;
  status: string;
  executor: string | null;
  skill: string | null;
  flow: string;
  proposed_at: string | null;
  started_at: string | null;
  approved_at: string | null;
  result_summary: string | null;
}

/**
 * One headline figure. `unmeasured` is not a styling flag — it is the
 * difference between "nobody is waiting on you" and "nobody looked".
 */
export interface RightNowFigure {
  readonly key: string;
  readonly label: string;
  readonly count: number;
  readonly unmeasured: boolean;
  readonly alert: boolean;
}

/**
 * Zone 2 — what is happening on this project now.
 *
 * Replaces the six stat tiles that led the page (Items / Active / Done /
 * Epics / Focus / Sessions). Those were vault counts: none of them answered
 * "does anything here need me today", which is the question the top of a
 * project page exists to answer. These four do.
 *
 * Every figure distinguishes a measured zero from a dark instrument. A failed
 * or still-loading dispatch read says "unmeasured", never 0 — a zero from a
 * request that never answered reads as an all-clear, which is the one thing
 * it never means.
 */
@Component({
  selector: 'app-project-right-now-section',
  imports: [UiBadge, UiSection, UiStack, VaultChip, RelativeTimePipe],
  templateUrl: './project-right-now-section.html',
  styleUrl: './project-right-now-section.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectRightNowSection {
  readonly attentionItems = input<readonly VaultItem[]>([]);
  readonly proposedTasks  = input<readonly DispatchTask[]>([]);
  readonly inFlightTasks  = input<readonly DispatchTask[]>([]);
  readonly pendingProposals = input<number>(0);

  /** The dispatch queue read has not answered (loading or failed). */
  readonly dispatchUnmeasured  = input(false);
  /** The understanding-proposals read has not answered. */
  readonly proposalsUnmeasured = input(false);

  readonly figures = computed<readonly RightNowFigure[]>(() => {
    const dispatchDark  = this.dispatchUnmeasured();
    const proposalsDark = this.proposalsUnmeasured();
    const attention = this.attentionItems().length;
    const proposed  = this.proposedTasks().length;
    const inFlight  = this.inFlightTasks().length;
    const beliefs   = this.pendingProposals();
    return [
      // Attention comes off the in-memory vault rows, which are already loaded
      // for the rest of the page — there is no separate read to go dark.
      { key: 'attention', label: 'Needs a decision', count: attention, unmeasured: false,       alert: attention > 0 },
      { key: 'proposed',  label: 'Awaiting approval', count: proposed, unmeasured: dispatchDark,  alert: false },
      { key: 'inflight',  label: 'In flight',         count: inFlight, unmeasured: dispatchDark,  alert: false },
      { key: 'beliefs',   label: 'Belief proposals',  count: beliefs,  unmeasured: proposalsDark, alert: false },
    ];
  });

  /**
   * True only when every strand actually answered and every one was empty.
   * A page that cannot see the queue must not claim the queue is clear.
   */
  readonly allClear = computed(() =>
    this.figures().every(f => !f.unmeasured && f.count === 0));

  readonly anyUnmeasured = computed(() => this.figures().some(f => f.unmeasured));

  readonly meta = computed<string | null>(() => {
    const n = this.attentionItems().length;
    return n > 0 ? `${n} needing a decision` : null;
  });

  isFlagged(item: VaultItem): boolean {
    // `assertion` — a system-generated "these facts don't add up" note. The
    // dashboard's VaultItemType union predates the type, hence the cast.
    return (item.type as string) === 'assertion';
  }

  taskWhen(task: DispatchTask): string | null {
    return task.started_at ?? task.approved_at ?? task.proposed_at;
  }
}
