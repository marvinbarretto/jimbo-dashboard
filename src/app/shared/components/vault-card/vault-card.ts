import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { KanbanCardLinkDirective } from '@shared/kanban/card-link.directive';
import { ActorChip } from '@shared/components/actor-chip/actor-chip';
import { ActorAvatar } from '@shared/components/actor-avatar/actor-avatar';
import { EntityChip } from '@shared/components/entity-chip/entity-chip';
import { PriorityBadge } from '@shared/components/priority-badge/priority-badge';
import { BlockerBadge } from '@shared/components/blocker-badge/blocker-badge';
import { EpicBadge } from '@shared/components/epic-badge/epic-badge';
import { DispatchStatusBadge } from '@shared/components/dispatch-status-badge/dispatch-status-badge';
import { CardParentLink } from '@shared/components/card-parent-link/card-parent-link';
import { CardCallout, type CalloutVariant } from '@shared/components/card-callout/card-callout';
import { EpicRollup } from '@shared/components/epic-rollup/epic-rollup';
import { effectivePriority, ageInDays, isStuck } from '@domain/vault';
import type { ActorId } from '@domain/ids';
import type {
  CardContext,
  GroomingCardContext,
  DispatchCardContext,
  ManualCardContext,
} from './card-context';
import { calloutKindFor } from './card-context';

@Component({
  selector: 'app-vault-card',
  imports: [
    RouterLink,
    DecimalPipe,
    KanbanCardLinkDirective,
    ActorChip,
    ActorAvatar,
    EntityChip,
    PriorityBadge,
    BlockerBadge,
    EpicBadge,
    DispatchStatusBadge,
    CardParentLink,
    CardCallout,
    EpicRollup,
  ],
  templateUrl: './vault-card.html',
  styleUrl: './vault-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.--proj-tint]': 'projectTint()',
  },
})
export class VaultCard {
  readonly context = input.required<CardContext>();

  // Outputs — every callsite emits only the ones it cares about. The board
  // owns service calls; the card stays presentational.
  readonly archive  = output<void>();
  readonly assign   = output<ActorId>();
  readonly approve  = output<void>();
  readonly reject   = output<string>();
  readonly answer   = output<void>();
  readonly retry    = output<void>();
  readonly dismiss  = output<void>();
  readonly markDone = output<void>();
  readonly decompose = output<void>();

  protected readonly projectTint = computed(() => {
    const ctx = this.context();
    return ctx.project?.color_token ?? null;
  });

  protected readonly seq = computed(() => {
    const ctx = this.context();
    if (ctx.kind === 'dispatch') return ctx.item?.seq ?? null;
    return ctx.item.seq;
  });

  protected readonly title = computed(() => {
    const ctx = this.context();
    if (ctx.kind === 'dispatch') return ctx.item?.title ?? `task #${ctx.entry.task_id}`;
    return ctx.item.title;
  });

  protected readonly isEpic = computed(() => {
    const ctx = this.context();
    return ctx.kind !== 'dispatch' && ctx.item.is_epic;
  });

  protected readonly priority = computed(() => {
    const ctx = this.context();
    if (ctx.kind === 'dispatch') return ctx.item ? effectivePriority(ctx.item) : null;
    return effectivePriority(ctx.item);
  });

  protected readonly grooming = computed(() => {
    const ctx = this.context();
    return ctx.kind === 'grooming' ? ctx : null;
  });
  protected readonly dispatch = computed(() => {
    const ctx = this.context();
    return ctx.kind === 'dispatch' ? ctx : null;
  });
  protected readonly manual = computed(() => {
    const ctx = this.context();
    return ctx.kind === 'manual' ? ctx : null;
  });

  protected readonly calloutKind = computed<CalloutVariant | null>(() => {
    const ctx = this.context();
    if (ctx.kind === 'grooming') return calloutKindFor(ctx);
    if (ctx.kind === 'dispatch') {
      const status = ctx.entry.status;
      if (status === 'failed' && ctx.entry.error) return 'error';
      if (status === 'completed' && ctx.entry.result_summary) return 'result';
    }
    return null;
  });

  protected readonly stuckDays = computed(() => {
    const g = this.grooming();
    if (!g) return 0;
    return Math.floor(g.daysInColumn);
  });
  protected readonly isStuck = computed(() => {
    const g = this.grooming();
    return g ? isStuck(g.daysInColumn) : false;
  });

  protected readonly ageLabel = computed(() => {
    const ctx = this.context();
    if (ctx.kind === 'dispatch') return this.dispatchRuntimeLabel(ctx);
    const ref = (ctx.kind === 'grooming' ? ctx.lastActivityAt : ctx.lastActivityAt) ?? ctx.item.created_at;
    return formatAgeShort(ref);
  });

  // Per-state action visibility — keep the template clean by computing
  // booleans up front. Each branch matches the state matrix in the prototype.
  protected readonly showAnswer    = computed(() => this.grooming()?.openQuestion != null);
  protected readonly showApprove   = computed(() => this.grooming()?.item.grooming_status === 'decomposed');
  protected readonly showReject    = computed(() => this.grooming()?.item.grooming_status === 'decomposed');
  protected readonly showDecompose = computed(() => this.grooming()?.item.grooming_status === 'classified');
  protected readonly showAssign    = computed(() => {
    const g = this.grooming();
    if (!g) return false;
    const s = g.item.grooming_status;
    return s === 'ungroomed' || s === 'intake_complete';
  });
  protected readonly showArchive = computed(() => {
    const ctx = this.context();
    if (ctx.kind === 'manual') return false; // manual cards prioritise mark-done
    if (ctx.kind === 'dispatch') return ctx.entry.status === 'failed';
    return ctx.item.grooming_status !== 'ready';
  });
  protected readonly showRetry    = computed(() => this.dispatch()?.entry.status === 'failed');
  protected readonly showDismiss  = computed(() => this.dispatch()?.entry.status === 'completed');
  protected readonly showMarkDone = computed(() => this.context().kind === 'manual');

  // Source attribution display — agent sources show an avatar inline.
  protected sourceLabel(ctx: GroomingCardContext | ManualCardContext): string | null {
    return ctx.source?.text ?? null;
  }

  // Dispatch runtime string — "queued 3m ago" / "5m elapsed" / "ran 47s" / etc.
  private dispatchRuntimeLabel(ctx: DispatchCardContext): string {
    const d = ctx.entry;
    switch (d.status) {
      case 'approved':    return `queued ${deltaFromNow(d.created_at)} ago`;
      case 'dispatching': return 'claiming…';
      case 'running':     return d.started_at ? `${deltaFromNow(d.started_at)} elapsed` : 'starting…';
      case 'completed':   return d.started_at && d.completed_at ? `ran ${delta(d.started_at, d.completed_at)}` : 'done';
      case 'failed':      return d.started_at && d.completed_at ? `failed after ${delta(d.started_at, d.completed_at)}` : 'failed';
    }
  }

  protected onArchive(e: Event): void { e.stopPropagation(); this.archive.emit(); }
  protected onApprove(e: Event): void { e.stopPropagation(); this.approve.emit(); }
  protected onAnswer(e: Event):  void { e.stopPropagation(); this.answer.emit();  }
  protected onRetry(e: Event):   void { e.stopPropagation(); this.retry.emit();   }
  protected onDismiss(e: Event): void { e.stopPropagation(); this.dismiss.emit(); }
  protected onMarkDone(e: Event): void { e.stopPropagation(); this.markDone.emit(); }
  protected onDecompose(e: Event): void { e.stopPropagation(); this.decompose.emit(); }
  protected onReject(e: Event): void {
    e.stopPropagation();
    // Lightweight prompt for the rejection reason — a real dialog is a
    // follow-up. Emits empty string if cancelled.
    const reason = window.prompt('Rejection reason?') ?? '';
    if (reason.trim()) this.reject.emit(reason.trim());
  }
}

function delta(fromIso: string, toIso: string): string {
  const ms = new Date(toIso).getTime() - new Date(fromIso).getTime();
  return formatDuration(ms);
}
function deltaFromNow(fromIso: string): string {
  return delta(fromIso, new Date().toISOString());
}
function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.max(0, ms)}ms`;
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ${sec % 60}s`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs}h ${min % 60}m`;
  return `${Math.floor(hrs / 24)}d ${hrs % 24}h`;
}
function formatAgeShort(iso: string | null): string {
  if (!iso) return '—';
  const days = Math.floor(ageInDays(iso));
  if (days > 0) return `${days}d`;
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 3_600_000) return `${Math.max(1, Math.round(ms / 60_000))}m`;
  return `${Math.round(ms / 3_600_000)}h`;
}
