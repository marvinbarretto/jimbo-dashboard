import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
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
import type { CommissionStage } from '@domain/dispatch';
import { CURRENT_ACTOR_ID } from '@domain/actors';
import { BlockerBadge } from '@shared/components/blocker-badge/blocker-badge';
import { EpicBadge } from '@shared/components/epic-badge/epic-badge';
import { CardCallout, type CalloutVariant } from '@shared/components/card-callout/card-callout';
import { EpicRollup } from '@shared/components/epic-rollup/epic-rollup';
import { UiTallyStrip } from '@shared/components/ui-tally-strip/ui-tally-strip';
import { ItemHeader } from '@shared/components/item-header/item-header';
import { effectivePriority, ageInDays, staleNorm, ancientNorm, isDone } from '@domain/vault';
import type { ActorId, VaultItemId } from '@domain/ids';
import type { IconName } from '@shared/components/app-icon/icon-registry';
import type {
  SourceLabel,
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

// No 'assign': the button rendered on every ungroomed card and did nothing —
// `onAction` returned early for it because reassignment has always belonged to
// the owner dropdown, which now lives in the band where the owner is.
export type ActionKey =
  | 'answer' | 'approve' | 'reject' | 'decompose'
  | 'archive' | 'delete' | 'retry' | 'dismiss' | 'markDone' | 'demote';

export type ActionVariant = 'primary' | 'danger' | 'warn' | 'neutral';

// `icon` maps to an entry in icon-registry. When present the button can render
// icon-only, label-only, or icon+label depending on the `actionDisplay` input.
export interface CardAction {
  readonly key:     ActionKey;
  readonly label:   string;
  readonly variant: ActionVariant;
  readonly icon?:   IconName;
}

/** A board-supplied marker shown in the card's head row. See `VaultCard.flags`. */
export interface CardFlag {
  readonly label: string;
  /** `blocked` = this card cannot move; `awaiting` = an agent is stalled on it. */
  readonly kind:  'blocked' | 'awaiting';
}

// Grooming actions — keyed off grooming_status. The matrix is small enough
// to read top-to-bottom; each branch lists the buttons in render order.
// Icons use the semantic names from icon-registry (not lucide names) so swapping
// the underlying icon never touches these factories.
function groomingActions(ctx: GroomingCardContext): CardAction[] {
  const status = ctx.item.grooming_status;
  const archive: CardAction = { key: 'archive', label: 'archive', variant: 'neutral', icon: 'archive'  };  // status='archived', reversible
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
      return [{ key: 'demote', label: '→ note', variant: 'neutral', icon: 'demote' }, archive, del];
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

/**
 * Whether the commission itself is finished — as opposed to the agent's run.
 *
 * `pr_open` is the case that matters: the executor exits `completed` the moment
 * it pushes a PR, while the commission stays live for however long that PR
 * waits for a human. Reading the run's exit code as the item's state is the
 * same conflation the stage pill was removed for, and it was still driving the
 * clock and the dismiss button.
 */
function stageIsSettled(stage: CommissionStage | undefined): boolean {
  if (!stage) return true;    // no stage supplied ⇒ plain dispatch row, status rules
  return stage === 'merged' || stage === 'failed' || stage === 'rejected' || stage === 'completed';
}

function dispatchActions(ctx: DispatchCardContext): CardAction[] {
  const status = ctx.entry.status;
  if (status === 'failed') {
    return [
      { key: 'retry',   label: 'retry',   variant: 'warn',    icon: 'retry'   },
      { key: 'archive', label: 'archive', variant: 'neutral', icon: 'archive' },
    ];
  }
  // Hides the run and keeps the row — POST /dispatch/{id}/dismiss, the same
  // soft hide the notification bar uses. Gated on the STAGE, not the run: a
  // `pr_open` commission has a completed run and a live pull request, and the
  // board was offering to hide it. Measured 2026-09-05: LOC-3155 sat in In
  // Progress with a dismiss button, a PR open ten days, and failing checks.
  if (status === 'completed' && stageIsSettled(ctx.stage)) {
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
    CardCallout,
    EpicRollup,
    ItemHeader,
    UiTallyStrip,
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

  /**
   * Board-level markers rendered inside the card's head row.
   *
   * These are states the *board* knows and the card does not — "blocking an
   * agent", a blocker label — and they used to render as siblings floating
   * above the card. Marvin, 2026-09-04: "this feels strange having 'blocking an
   * agent' outside the card". A label describing a card that is not part of it
   * reads like a separate object, and it cost a whole row per flagged item.
   */
  readonly flags = input<readonly CardFlag[]>([]);

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

  // Feeds app-item-header's epic chip. Just the title: the chip is a link to
  // the parent, so the seq is reachable rather than recited, and the old "↳"
  // was saying "belongs to" in a slot that already means it.
  protected readonly epicHeaderLabel = computed<string | null>(() => {
    const parent = this.context().parentEpic;
    return parent ? parent.title : null;
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

  /**
   * How far the card has drained toward neutral, 0..1.
   *
   * The same sqrt(days / ANCIENT_DAYS) curve the old amber wash used for its
   * hue — the discrimination is simply spent subtractively now. `staleNorm`
   * saturates at seven days, which is why it drives nothing here: on a board
   * where most cards are older than a week it had no range left to spend.
   */
  protected readonly fadeVal = computed(() => this.ancientNormVal());

  /**
   * Whole quiet days, for the tally strip.
   *
   * Dispatch rows are ephemeral workflow records rather than the long-lived
   * item — the same reason they are treated as fresh by the staleness norms —
   * so they carry no tally at all.
   */
  protected readonly tallyDays = computed(() => {
    const ctx = this.context();
    if (ctx.kind === 'dispatch') {
      // A dispatch row is ephemeral workflow and carries no tally — except at
      // `pr_open`, where it is the longest-lived thing on the board: the run is
      // over and the commission is waiting on a human. Ten days of that looked
      // exactly like ten minutes of it.
      if (ctx.stage !== 'pr_open' || !ctx.entry.completed_at) return 0;
      return Math.max(0, Math.floor(ageInDays(ctx.entry.completed_at)));
    }
    const ref = ctx.lastActivityAt ?? ctx.item.created_at;
    return Math.max(0, Math.floor(ageInDays(ref)));
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
    if (ctx.kind === 'dispatch') return ctx.item?.seq ?? ctx.taskSeq ?? null;
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
    if (ctx.kind === 'dispatch') return ctx.item?.title ?? ctx.taskTitle ?? `task #${ctx.entry.task_id}`;
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

  // Genesis chip + model line — both live on dispatch contexts. The genesis
  // chip surfaces how the item came to exist (manual / auto-decomposed / etc);
  // the model line surfaces which model the executor picked for this run.
  protected readonly genesis = computed(() => this.dispatch()?.genesis ?? null);

  /**
   * Hover text for the PR link, keyed off the CI reading.
   *
   * Null ("never checked") deliberately reads as unknown rather than as fine:
   * the server treats a missing reading as "do not block", and a card that
   * claimed green on no evidence would be the same false confidence that let
   * three broken PRs sit in the review queue on 2026-08-27.
   */
  /**
   * How far the PR has drifted from its base, when that is worth saying.
   *
   * `clean` renders nothing: the absence of a warning is the statement, and a
   * green "level with master" chip on every healthy card is the noise the old
   * stage pill was. Null is silence too — never checked is not the same as fine,
   * but it is not evidence of trouble either.
   */
  protected readonly driftLabel = computed<string | null>(() => {
    const d = this.dispatch()?.entry;
    if (!d?.pr_url) return null;
    if (d.pr_mergeable === 'dirty') return 'conflicts';
    if (d.pr_mergeable === 'behind') {
      const n = d.pr_behind_by ?? 0;
      return n > 0 ? `behind ${n}` : 'behind';
    }
    return null;
  });

  protected readonly driftTitle = computed(() => {
    const d = this.dispatch()?.entry;
    if (d?.pr_mergeable === 'dirty') return 'Conflicts with the base branch — needs a human to resolve';
    const n = d?.pr_behind_by ?? 0;
    return `${n} commit(s) behind the base branch — needs a rebase before its checks mean anything`;
  });

  protected readonly prChecksTitle = computed(() => {
    switch (this.dispatch()?.entry.pr_checks) {
      case 'failing': return 'CI failing — held out of the review queue until it goes green';
      case 'pending': return 'CI still running';
      case 'passing': return 'CI green';
      default:        return 'CI not checked yet';
    }
  });
  protected readonly modelId = computed(() => this.dispatch()?.modelId ?? null);
  protected readonly manual = computed(() => {
    const ctx = this.context();
    return ctx.kind === 'manual' ? ctx : null;
  });

  /**
   * The skill grooming chose for this item, for cards that aren't dispatched yet.
   *
   * The column is a text[]; the board projection returns element 1 — the one the
   * dispatch query would actually run — so this is already a single skill id.
   */
  protected readonly suggestedSkill = computed<string | null>(() => {
    const ctx = this.context();
    const raw = ctx.kind === 'manual' ? ctx.item.suggested_skills
      : ctx.kind === 'grooming' ? ctx.item.suggested_skills
      : null;
    return raw?.trim() || null;
  });

  /**
   * Whether the chosen skill is worth drawing.
   *
   * Only when there is one, and not once the item is finished — routing stops
   * being a fact about the future at that point. The absence used to render as
   * an amber "no skill" on every card without one, which fired hardest on
   * human-owned items: the pump's refusal applies to agent-assigned leaves
   * (`grooming-transition.ts`), and the pile of those already has a screen —
   * `unroutableGate` lists them by name precisely so a stoppage cannot look
   * like a working system. A card-level copy warned about the wrong cards and
   * duplicated the right ones.
   */
  protected readonly showSkill = computed(() => {
    const ctx = this.context();
    if (ctx.kind !== 'manual' && ctx.kind !== 'grooming') return false;
    return !!this.suggestedSkill() && !isDone(ctx.item);
  });

  // Grooming callouts only. A dispatch context used to raise `result`/`error`
  // here, which put an agent's free-text run summary on the face of a kanban
  // card — the longest thing on the board, unreadable at card width, and the
  // only place it existed. It now lives in the item's detail view instead.
  protected readonly calloutKind = computed<CalloutVariant | null>(() => {
    const ctx = this.context();
    return ctx.kind === 'grooming' ? calloutKindFor(ctx) : null;
  });

  /**
   * Where this item came from, for either card kind that has one.
   *
   * The template used to read `grooming()?.source` directly, so the execution
   * board built a source label per manual card that could never render. One
   * accessor, both kinds, and the dead work becomes visible work.
   */
  protected readonly sourceLine = computed<SourceLabel | null>(() => {
    const ctx = this.context();
    return ctx.kind === 'dispatch' ? null : ctx.source;
  });

  /**
   * Whether the reassignment dropdown has anywhere to go.
   *
   * The owner avatar itself moved into the band, so without a picker this row
   * would be a second copy of what the band already says.
   */
  protected readonly reassignable = computed(
    () => this.context().kind !== 'dispatch' && this.actorOptions().length > 0,
  );

  /** Whether the meta row carries anything — it is omitted rather than empty. */
  protected readonly metaRowVisible = computed(() => {
    const ctx = this.context();
    if (ctx.kind === 'dispatch') return true;   // always carries at least the skill
    if (this.showSkill()) return true;
    if (this.isEpic()) return true;
    if ((this.grooming()?.openQuestionsCount ?? 0) > 0) return true;
    return this.sourceClass() === 'github' && !!this.sourceUrl();
  });

  // The stuck pill is gone with the body's age span. It marked days-in-column
  // crossing the staleness threshold — a different clock from the one the band
  // and the tally now show (days since last activity), and there is nowhere on
  // the card that means "how long has it sat in THIS lane". `daysInColumn` is
  // still on the grooming context for whoever draws it next.
  protected readonly ageLabel = computed(() => {
    const ctx = this.context();
    if (ctx.kind === 'dispatch') return this.dispatchRuntimeLabel(ctx);
    const ref = (ctx.kind === 'grooming' ? ctx.lastActivityAt : ctx.lastActivityAt) ?? ctx.item.created_at;
    return formatAgeShort(ref);
  });

  // Single source of truth for which buttons render. To change the action set
  // for a state, edit groomingActions / dispatchActions / manualActions above.
  //
  // `mark done` is dropped everywhere: manual lanes are drag targets, so
  // dragging a card to Done already says it, and a button restating a gesture
  // costs a row on every card. It used to be dropped only under compact, which
  // meant the same card carried the button on one board and not the other.
  // Marvin, 2026-09-04: "mark done is unnecessary, i can drag it to done column".
  // Agent-side actions (dismiss, approve) survive — those cards are system-
  // driven and not draggable, so the button is the only way to act.
  protected readonly actions = computed<readonly CardAction[]>(
    () => actionsFor(this.context()).filter(a => a.key !== 'markDone'),
  );

  // Dispatch runtime string — "queued 3m ago" / "5m elapsed" / "ran 47s" / etc.
  private dispatchRuntimeLabel(ctx: DispatchCardContext): string {
    const d = ctx.entry;
    // A live commission reports how long it has been waiting, not how long the
    // agent took. "ran 9m 18s" on a card that has not moved in ten days is the
    // wrong fact: the run's duration is history the moment the PR opens, and
    // the lane it sits in claims something is happening.
    if (ctx.stage === 'pr_open' && d.completed_at) {
      return `PR open ${formatAgeShort(d.completed_at)}`;
    }
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
