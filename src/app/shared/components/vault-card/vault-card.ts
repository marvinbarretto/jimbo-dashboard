import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { KanbanCardLinkDirective } from '@shared/kanban/card-link.directive';
import { ActorAvatar } from '@shared/components/actor-avatar/actor-avatar';
import { AppIcon } from '@shared/components/app-icon/app-icon';
import { PickerInputDirective, type MentionTrigger, projectPickerTrigger, epicPickerTrigger } from '@shared/mentions';
import { PriorityBadge } from '@shared/components/priority-badge/priority-badge';
import { UiDropdown } from '@shared/components/ui-dropdown/ui-dropdown';
import type { Project } from '@domain/projects';
import type { VaultItem, SourceKind } from '@domain/vault';
import type { Priority } from '@domain/vault/vault-item';
import type { Actor } from '@domain/actors';
import { CURRENT_ACTOR_ID } from '@domain/actors';
import { BlockerBadge } from '@shared/components/blocker-badge/blocker-badge';
import { EpicBadge } from '@shared/components/epic-badge/epic-badge';
import { DispatchStatusBadge } from '@shared/components/dispatch-status-badge/dispatch-status-badge';
import { CardCallout, type CalloutVariant } from '@shared/components/card-callout/card-callout';
import { EpicRollup } from '@shared/components/epic-rollup/epic-rollup';
import { ItemHeader } from '@shared/components/item-header/item-header';
import { effectivePriority, ageInDays, isStuck, staleNorm, ancientNorm } from '@domain/vault';
import type { ActorId, VaultItemId } from '@domain/ids';
import type { IconName } from '@shared/components/app-icon/icon-registry';
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
  | 'archive' | 'delete' | 'assign' | 'retry' | 'dismiss' | 'markDone' | 'demote';

export type ActionVariant = 'primary' | 'danger' | 'warn' | 'neutral';

// `icon` maps to an entry in icon-registry. When present the button can render
// icon-only, label-only, or icon+label depending on the `actionDisplay` input.
export interface CardAction {
  readonly key:     ActionKey;
  readonly label:   string;
  readonly variant: ActionVariant;
  readonly icon?:   IconName;
}

// Grooming actions — keyed off grooming_status. The matrix is small enough
// to read top-to-bottom; each branch lists the buttons in render order.
// Icons use the semantic names from icon-registry (not lucide names) so swapping
// the underlying icon never touches these factories.
function groomingActions(ctx: GroomingCardContext): CardAction[] {
  const status = ctx.item.grooming_status;
  const archive: CardAction = { key: 'archive', label: 'archive', variant: 'neutral', icon: 'archive'  };  // status='archived', reversible
  const assign:  CardAction = { key: 'assign',  label: 'assign',  variant: 'neutral'                   };
  // Delete is for "shouldn't have existed" rows — only offered in the pre-
  // dispatch funnel where investment is low. Once an item is decomposed or
  // ready, the audit trail is worth more than the row, so archive only.
  const del:     CardAction = { key: 'delete',  label: 'delete',  variant: 'danger',  icon: 'delete'   };

  if (ctx.openQuestion) {
    return [
      { key: 'answer', label: 'answer', variant: 'primary', icon: 'answer' },
      archive,
    ];
  }
  switch (status) {
    case 'decomposed':
      return [
        { key: 'approve', label: 'approve', variant: 'primary', icon: 'approve'   },
        { key: 'reject',  label: 'reject',  variant: 'danger',  icon: 'reject'    },
        archive,
      ];
    case 'classified':
      return [
        { key: 'decompose', label: 'decompose', variant: 'neutral', icon: 'decompose' },
        archive,
        del,
      ];
    case 'ungroomed':
    case 'intake_complete':
      return [{ key: 'demote', label: '→ note', variant: 'neutral', icon: 'demote' }, archive, assign, del];
    case 'needs_rework':
      return [archive, del];
    case 'intake_rejected':
      return [{ key: 'demote', label: '→ note', variant: 'neutral', icon: 'demote' }, archive, del];
    case 'ready':
      // Passive — pump claims it. No actions needed.
      return [];
    case 'settled':
      // Terminal: reference material or a container. Nothing to groom, but it
      // can still be filed away.
      return [archive];
  }
}

function dispatchActions(ctx: DispatchCardContext): CardAction[] {
  const status = ctx.entry.status;
  if (status === 'failed') {
    return [
      { key: 'retry',   label: 'retry',   variant: 'warn',    icon: 'retry'   },
      { key: 'archive', label: 'archive', variant: 'neutral', icon: 'archive' },
    ];
  }
  if (status === 'completed') {
    // Hides the run and keeps the row — POST /dispatch/{id}/dismiss, the same
    // soft hide the notification bar uses. It used to be a hard DELETE behind
    // this label, which is why it briefly read "delete run".
    return [{ key: 'dismiss', label: 'dismiss', variant: 'neutral' }];
  }
  // approved / dispatching / running — passive, system-managed.
  return [];
}

// A human closing their own work. Deliberately NOT a review disposition:
// nobody is certifying an agent's delivery, so it writes status_changed
// (active → done) rather than review_approved. Same terminal state, different
// act, and the trail keeps them apart — which is the same reason approve and
// mark-done-unreviewed stayed separate.
function manualActions(_ctx: ManualCardContext): CardAction[] {
  return [{ key: 'markDone', label: 'mark done', variant: 'primary', icon: 'mark-done' }];
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
    AppIcon,
    PickerInputDirective,
    PriorityBadge,
    UiDropdown,
    BlockerBadge,
    EpicBadge,
    DispatchStatusBadge,
    CardCallout,
    EpicRollup,
    ItemHeader,
  ],
  templateUrl: './vault-card.html',
  styleUrl: './vault-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.--proj-tint]':    'projectTint()',
    '[style.--stale-norm]':   'staleNormVal()',
    '[style.--ancient-norm]': 'ancientNormVal()',
    // E2E hooks — see docs/conventions.md §"E2E selectors via data-testid".
    '[attr.data-testid]':     "'vault-card'",
    '[attr.data-seq]':        'seq()',
    // Ownership modifier classes — drive the left-accent and opacity treatment.
    // Three states; exactly one class is active at a time.
    '[class.vault-card--mine]':       "ownership() === 'mine'",
    '[class.vault-card--theirs]':     "ownership() === 'theirs'",
    '[class.vault-card--unassigned]': "ownership() === 'unassigned'",
    // Source-class modifier — surfaces the origin of the item.
    '[class.vault-card--github]':     "sourceClass() === 'github'",
    '[class.vault-card--pr-comment]': "sourceClass() === 'pr-comment'",
    '[class.vault-card--agent]':      "sourceClass() === 'agent'",
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
  readonly actorOptions   = input<readonly Actor[]>([]);

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

  // Data-carrying outputs — kept separate because the board needs the value,
  // not just notification that the action occurred.
  readonly assign         = output<ActorId>();
  readonly priorityChange = output<Priority | null>();

  // Single notification channel for all void-style actions. The board switch-
  // dispatches to the right service call. Adding a new action only requires
  // extending ActionKey + the groomingActions/dispatchActions/manualActions
  // helpers above — no new outputs, no new template bindings.
  readonly actionTriggered = output<ActionKey>();

  // Controls how action buttons render their content.
  //   'icon'       — icon only; label becomes aria-label + title tooltip.
  //   'label'      — text only (original behaviour).
  //   'icon+label' — icon left of text label (default; most scannable).
  // Falls back to 'label' for actions that have no icon registered.
  readonly actionDisplay = input<'icon' | 'label' | 'icon+label'>('icon+label');

  protected readonly projectTint = computed(() => {
    const ctx = this.context();
    return ctx.project?.color_token ?? null;
  });

  // Feeds app-item-header's "epic" secondary slot — same "↳ #<seq> <title>"
  // shape the old plain-text project-bar link used, just formatted for a
  // non-interactive display span instead of a routerLink.
  protected readonly epicHeaderLabel = computed<string | null>(() => {
    const parent = this.context().parentEpic;
    return parent ? `↳ #${parent.seq} ${parent.title}` : null;
  });

  // ── Ownership ──────────────────────────────────────────────────────────────
  // Three-state: 'mine' (owner === current actor), 'theirs' (someone else owns
  // it), 'unassigned' (no owner set). Drives CSS class modifiers on the host.
  // Dispatch cards use entry.executor as the effective owner — executors are
  // always set once dispatched, so they are never 'unassigned'.
  protected readonly ownership = computed<'mine' | 'theirs' | 'unassigned'>(() => {
    const ctx = this.context();
    const owner = ctx.kind === 'dispatch' ? ctx.owner : ctx.owner;
    if (!owner) return 'unassigned';
    return owner === CURRENT_ACTOR_ID ? 'mine' : 'theirs';
  });

  // ── Source class ───────────────────────────────────────────────────────────
  // Machine-readable origin kind — drives the GH badge and source-class CSS
  // modifier. Null for dispatch contexts (source lives on the referenced item,
  // not on the queue entry itself).
  protected readonly sourceClass = computed<SourceKind | null>(() => {
    const ctx = this.context();
    if (ctx.kind === 'dispatch') return null;
    return ctx.sourceKind;
  });

  // Resolved source URL — used by the GH icon link. Only exists on grooming/manual.
  protected readonly sourceUrl = computed<string | null>(() => {
    const ctx = this.context();
    if (ctx.kind === 'dispatch') return null;
    return ctx.sourceUrl;
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

  protected readonly priorityOptions: readonly { label: string; value: Priority | null }[] = [
    { label: 'P0 — urgent', value: 0 },
    { label: 'P1 — high',   value: 1 },
    { label: 'P2 — normal', value: 2 },
    { label: 'P3 — low',    value: 3 },
    { label: '— clear',     value: null },
  ];

  protected readonly seq = computed(() => {
    const ctx = this.context();
    if (ctx.kind === 'dispatch') return ctx.item?.seq ?? null;
    return ctx.item.seq;
  });

  // Operator-facing handle. Prefixes the seq with the project short code
  // (`LOC-3062`) when one exists, else the bare `#3062`. The seq remains the
  // routing key — only the label changes — so `/vault-items/<seq>` is unaffected.
  protected readonly seqLabel = computed(() => {
    const s = this.seq();
    if (s === null) return null;
    const code = this.context().project?.short_code;
    return code ? `${code}-${s}` : `#${s}`;
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

  // Genesis chip + model line — both live on dispatch contexts. The genesis
  // chip surfaces how the item came to exist (manual / auto-decomposed / etc);
  // the model line surfaces which model the executor picked for this run.
  protected readonly genesis = computed(() => this.dispatch()?.genesis ?? null);
  protected readonly modelId = computed(() => this.dispatch()?.modelId ?? null);
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
    if (key === 'assign') return; // handled by actor avatar dropdown
    this.actionTriggered.emit(key);
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
