import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { KanbanCardLinkDirective } from '@shared/kanban/card-link.directive';
import { ActorAvatar } from '@shared/components/actor-avatar/actor-avatar';
import { PickerInputDirective, type MentionTrigger, projectPickerTrigger, epicPickerTrigger } from '@shared/mentions';
import { PriorityBadge } from '@shared/components/priority-badge/priority-badge';
import type { Project } from '@domain/projects';
import type { VaultItem } from '@domain/vault';
import { BlockerBadge } from '@shared/components/blocker-badge/blocker-badge';
import { EpicBadge } from '@shared/components/epic-badge/epic-badge';
import { DispatchStatusBadge } from '@shared/components/dispatch-status-badge/dispatch-status-badge';
import { CardCallout, type CalloutVariant } from '@shared/components/card-callout/card-callout';
import { EpicRollup } from '@shared/components/epic-rollup/epic-rollup';
import { effectivePriority, ageInDays, isStuck, staleNorm, ancientNorm } from '@domain/vault';
import type { ActorId, VaultItemId } from '@domain/ids';
import type {
  CardContext,
  GroomingCardContext,
  DispatchCardContext,
  ManualCardContext,
} from './card-context';
import { calloutKindFor } from './card-context';

// ── Action registry ────────────────────────────────────────────────────
// Single source of truth for which buttons appear in which state. To add or
// reshuffle a button: edit the per-kind helper below — that's the whole API.
// The template just iterates `actions()` and dispatches via `onAction(key)`.

export type ActionKey =
  | 'answer' | 'approve' | 'reject' | 'decompose'
  | 'archive' | 'delete' | 'assign' | 'retry' | 'dismiss' | 'markDone';

export type ActionVariant = 'primary' | 'danger' | 'warn' | 'neutral';

export interface CardAction {
  readonly key:     ActionKey;
  readonly label:   string;
  readonly variant: ActionVariant;
}

// Grooming actions — keyed off grooming_status. The matrix is small enough
// to read top-to-bottom; each branch lists the buttons in render order.
function groomingActions(ctx: GroomingCardContext): CardAction[] {
  const status = ctx.item.grooming_status;
  const archive: CardAction = { key: 'archive', label: 'archive', variant: 'neutral' };
  const assign:  CardAction = { key: 'assign',  label: 'assign',  variant: 'neutral' };
  // Delete is for "shouldn't have existed" rows — only offered in the pre-
  // dispatch funnel where investment is low. Once an item is decomposed or
  // ready, the audit trail is worth more than the row, so archive only.
  const del:     CardAction = { key: 'delete',  label: 'delete',  variant: 'danger'  };

  if (ctx.openQuestion) {
    return [
      { key: 'answer', label: 'answer', variant: 'primary' },
      archive,
    ];
  }
  switch (status) {
    case 'decomposed':
      return [
        { key: 'approve', label: 'approve', variant: 'primary' },
        { key: 'reject',  label: 'reject',  variant: 'danger'  },
        archive,
      ];
    case 'classified':
      return [
        { key: 'decompose', label: 'decompose', variant: 'neutral' },
        archive,
        del,
      ];
    case 'ungroomed':
    case 'intake_complete':
      return [archive, assign, del];
    case 'needs_rework':
    case 'intake_rejected':
      return [archive, del];
    case 'ready':
      // Passive — pump claims it. No actions needed.
      return [];
  }
}

function dispatchActions(ctx: DispatchCardContext): CardAction[] {
  const status = ctx.entry.status;
  if (status === 'failed') {
    return [
      { key: 'retry',   label: '↻ retry', variant: 'warn'    },
      { key: 'archive', label: 'archive', variant: 'neutral' },
    ];
  }
  if (status === 'completed') {
    return [{ key: 'dismiss', label: 'dismiss', variant: 'neutral' }];
  }
  // approved / dispatching / running — passive, system-managed.
  return [];
}

function manualActions(_ctx: ManualCardContext): CardAction[] {
  return [{ key: 'markDone', label: 'mark done', variant: 'primary' }];
}

function actionsFor(ctx: CardContext): CardAction[] {
  switch (ctx.kind) {
    case 'grooming': return groomingActions(ctx);
    case 'dispatch': return dispatchActions(ctx);
    case 'manual':   return manualActions(ctx);
  }
}

@Component({
  selector: 'app-vault-card',
  imports: [
    RouterLink,
    DecimalPipe,
    KanbanCardLinkDirective,
    ActorAvatar,
    PickerInputDirective,
    PriorityBadge,
    BlockerBadge,
    EpicBadge,
    DispatchStatusBadge,
    CardCallout,
    EpicRollup,
  ],
  templateUrl: './vault-card.html',
  styleUrl: './vault-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.--proj-tint]':    'projectTint()',
    '[style.--stale-norm]':   'staleNormVal()',
    '[style.--ancient-norm]': 'ancientNormVal()',
    // E2E hooks — see docs/conventions.md §"E2E selectors via data-testid".
    // Stable surface for tests; class names can drift with CSS refactors.
    // The column wrapper supplies column-status filtering; the card just
    // needs to identify itself by the operator-facing seq. We use the
    // explicit `[attr.]` binding form for both attributes — the bare-key
    // host syntax is treated as an expression, so a literal string would
    // need escaping anyway.
    '[attr.data-testid]':     "'vault-card'",
    '[attr.data-seq]':        'seq()',
  },
})
export class VaultCard {
  readonly context = input.required<CardContext>();

  // Options for the inline backfill pickers. Supply empty arrays (or just omit)
  // when the card shouldn't offer the picker — e.g. dispatch rows, or kinds
  // where the board doesn't surface project/epic assignment from this surface.
  // The triggers + dropdown are reused from the existing mention infrastructure.
  readonly projectOptions = input<readonly Project[]>([]);
  readonly epicOptions    = input<readonly VaultItem[]>([]);

  // Emitted on pick. The board owns the actual mutation (junction insert /
  // parent_id patch). Card stays presentational.
  readonly projectAssigned = output<string>();          // project id
  readonly epicAssigned    = output<VaultItemId>();     // epic vault-item id

  // Stable trigger refs (lazy-built once). The trigger's `search()` closes
  // over the option-signal so it always reads the current list without us
  // having to recreate the trigger on every CD cycle.
  private readonly _projectTrigger = computed<MentionTrigger>(() =>
    projectPickerTrigger(this.projectOptions, p => this.projectAssigned.emit(p.id as string)),
  );
  private readonly _epicTrigger = computed<MentionTrigger>(() =>
    epicPickerTrigger(this.epicOptions, e => this.epicAssigned.emit(e.id)),
  );

  // Public triggers — null when nothing to pick, so the template can hide the
  // dashed CTA entirely instead of opening an empty dropdown.
  protected readonly projectTrigger = computed<MentionTrigger | null>(() =>
    this.projectOptions().length > 0 ? this._projectTrigger() : null,
  );
  protected readonly epicTrigger = computed<MentionTrigger | null>(() =>
    this.epicOptions().length > 0 ? this._epicTrigger() : null,
  );

  // Outputs — every callsite emits only the ones it cares about. The board
  // owns service calls; the card stays presentational.
  readonly archive    = output<void>();
  readonly removeItem = output<void>();
  readonly assign     = output<ActorId>();
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

  // Staleness gradient — drives the amber wash + glow via the shared mixin.
  // Dispatch entries are ephemeral workflow rows, not the long-lived item, so
  // they're treated as fresh.
  protected readonly staleNormVal = computed(() => {
    const ctx = this.context();
    if (ctx.kind === 'dispatch') return 0;
    return staleNorm(ctx.item, ctx.lastActivityAt);
  });
  protected readonly ancientNormVal = computed(() => {
    const ctx = this.context();
    if (ctx.kind === 'dispatch') return 0;
    return ancientNorm(ctx.item, ctx.lastActivityAt);
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

  // Topic tags surfaced under the title. Triage-rule: tags are topic-only,
  // never source/author/channel, so they're rendered as a flat monochrome row
  // with a `#` prefix and no per-tag colour.
  protected readonly tags = computed<readonly string[]>(() => {
    const ctx = this.context();
    if (ctx.kind === 'dispatch') return ctx.item?.tags ?? [];
    return ctx.item.tags ?? [];
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

  // Single source of truth for which buttons render. To change the action set
  // for a state, edit groomingActions / dispatchActions / manualActions above.
  protected readonly actions = computed<readonly CardAction[]>(() => actionsFor(this.context()));

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

  // Single dispatch entry point — the template never wires output emitters
  // directly. Adding a new ActionKey only requires extending the switch here.
  protected onAction(key: ActionKey, event: Event): void {
    event.stopPropagation();
    switch (key) {
      case 'answer':    this.answer.emit();    return;
      case 'approve':   this.approve.emit();   return;
      case 'decompose': this.decompose.emit(); return;
      case 'archive':   this.archive.emit();   return;
      case 'retry':     this.retry.emit();     return;
      case 'dismiss':   this.dismiss.emit();   return;
      case 'markDone':  this.markDone.emit();  return;
      case 'assign': {
        // Picker UI is a follow-up — the (assign) output carries the actor id
        // once that's wired. For now, no-op so the button doesn't lie.
        return;
      }
      case 'reject': {
        // Lightweight prompt for the rejection reason — a real composer is a
        // follow-up. Emits nothing if cancelled or empty.
        const reason = window.prompt('Rejection reason?') ?? '';
        if (reason.trim()) this.reject.emit(reason.trim());
        return;
      }
      case 'delete':
        // Hard delete is a one-click action — the toast surfaces what just
        // happened with seq + title, and the optimistic-remove path means a
        // server failure restores the row. No confirm dialog by design.
        this.removeItem.emit();
        return;
    }
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
