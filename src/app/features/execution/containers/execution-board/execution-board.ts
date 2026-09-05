import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { take } from 'rxjs';
import { DispatchService } from '@features/execution/data-access/dispatch.service';
import { VaultItemsService } from '@features/vault-items/data-access/vault-items.service';
import { VaultItemCommands } from '@features/vault-items/commands/vault-item-commands';
import { DispatchCommands } from '@features/execution/commands/dispatch-commands';
import { VaultItemProjectsService } from '@features/vault-items/data-access/vault-item-projects.service';
import { VaultItemDependenciesService } from '@features/vault-items/data-access/vault-item-dependencies.service';
import { ProjectsService } from '@features/projects/data-access/projects.service';
import { ActorsService } from '@features/actors/data-access/actors.service';
import { type CommissionItem, type CommissionStage } from '@domain/dispatch';
import type { VaultItemId } from '@domain/ids';
import { VaultCard, type ActionKey, type CardFlag } from '@shared/components/vault-card/vault-card';
import type { CommissionAction } from '@features/execution/components/commission-card/commission-card';
import type { CardContext, ManualCardContext, DispatchCardContext, ParentEpicRef, ProjectRef, SourceLabel } from '@shared/components/vault-card/card-context';
import { KanbanColumn } from '@shared/components/kanban-column/kanban-column';
import { KanbanFilterBar, type FilterGroup } from '@shared/components/kanban-filter-bar/kanban-filter-bar';
import { BoardCreateBar } from '@shared/components/board-create-bar/board-create-bar';
import { createKanbanFilterState } from '@shared/kanban/filter-state';
import {
  createKanbanColumnLimit, parseColumnLimit, serializeColumnLimit,
  COLUMN_LIMIT_OPTIONS,
} from '@shared/kanban/column-limit';
import { createKanbanDragState } from '@shared/kanban/drag-state';
import {
  projectFilterGroup, ownerFilterGroup, priorityFilterGroup, epicFilterGroup,
  readinessFilterGroup, readinessKeyOf,
  epicsForProjects, effectiveEpicSelection, epicKeyOf,
  PROJECT, OWNER, PRIORITY, EPIC, READINESS, UNASSIGNED, NO_PRIORITY,
} from '@shared/kanban/filter-groups';
import { withVaultDetailModal, swapDetailSeq } from '@shared/kanban/detail-modal';
import { CommandShortcutsService } from '@shared/services/command-shortcuts.service';
import {
  effectivePriority, isActive, isDone, compareSortableBy, toSortableCard, SORT_OPTIONS,
  type SortMode, type SortableCard, type VaultItem,
} from '@domain/vault';
import { ExecutionConfigService } from '@features/execution/data-access/execution-config.service';
import { UiButtonLink } from '@shared/components/ui-button-link/ui-button-link';
import { VaultTypesService } from '@features/vault-items/data-access/vault-types.service';
import { AwaitingService } from '@features/awaiting/data-access/awaiting.service';
import { AwaitingStrip } from '@features/awaiting/containers/awaiting-strip/awaiting-strip';
import { withLiveBoardUpdates } from '@features/execution/live/board-live';

// The board collapsed from "Ready + 8 commission-stage columns" into three
// workflow lanes that BOTH manual (human-owned) and automated (agent-commission)
// cards share. The fine-grained commission lifecycle (proposed/running/pr_open/
// merged/…) no longer gets a column each — a card flashes through those too fast
// for a column to be meaningful — it shows as a pill ON the card instead. The
// lane a card sits in is the coarse "where is this in my flow" signal:
//   ready       — waiting to be picked up / started (incl. groomed-ready agent
//                 tasks and proposed commissions awaiting approval)
//   in_progress — actively being worked (manual: started_at set; agent:
//                 approved/running/pr_open)
//   done        — finished (manual: completed; agent: merged/completed, plus the
//                 terminal-negative failed/rejected, which carry a red pill)
//
// 2026-09-04: three more lanes. The original collapse was right about the
// *commission* stages — a card flashes through proposed/running/pr_open too fast
// for a column to mean anything. These three are the opposite: items sit in them
// for weeks (#2772 had been unroutable for 72 days), and until now they were
// visible only as read-only counts in the gates strip above the board, which is
// to say the board could not show you anything stuck *before* dispatch — which
// was nearly everything.
//   deferred    — the orchestrator parked it while the grooming gate is
//                 saturated. Sitting patiently is the valve working, not a
//                 fault, so this lane is collapsed by default and carries no
//                 alarm colour. Marvin, 2026-09-04: "the other items just sit
//                 patiently - its not a problem and shouldnt be thought of as
//                 one".
type BoardLane = 'waiting_on_you' | 'ready' | 'in_progress' | 'review' | 'done' | 'deferred';
const LANE_ORDER: readonly BoardLane[] = [
  'waiting_on_you', 'ready', 'in_progress', 'review', 'done', 'deferred',
];

const LANE_LABELS: Record<BoardLane, string> = {
  waiting_on_you: 'Waiting on you',
  ready:          'Ready',
  in_progress:    'In Progress',
  review:         'Review',
  done:           'Done',
  deferred:       'Deferred',
};

const LANE_EMPTY: Record<BoardLane, string> = {
  waiting_on_you: 'Nobody is waiting on you',
  ready:          'Nothing ready',
  in_progress:    'Nothing in progress',
  review:         'Nothing to review',
  done:           'Nothing done',
  deferred:       'Nothing parked',
};

// Map a commission's stage onto a lane. Agent cards are system-driven: their lane
// follows the dispatch, so they're not draggable.
//
// `noteStillActive` decides Review. The API's universal review gate never
// auto-sets a note to `done` on completion (services/dispatch.ts): a finished
// commission leaves the note `active`, and that pair — completed dispatch,
// active note — IS the review queue. It back-pressures deliberately, because
// every unreviewed item holds a commission slot until Marvin approves or sends
// it back, so the review rate throttles the whole execution lane.
function laneForStage(stage: CommissionStage, noteStillActive: boolean): BoardLane {
  switch (stage) {
    // `approved` means greenlit and queued, NOT started — measured 2026-09-04,
    // JIM-4950 sat approved for 90 minutes with `started_at` still null. Calling
    // that In Progress told Marvin an agent was working when none had claimed it.
    case 'proposed':
    case 'approved':  return 'ready';
    case 'running':
    case 'pr_open':   return 'in_progress';
    case 'completed': return noteStillActive ? 'review' : 'done';
    case 'merged':
    case 'failed':
    case 'rejected':  return 'done';         // terminal (failed/rejected = red pill)
  }
}

// Map a manual (human-track) item onto a lane from its own state. started_at is
// the only thing distinguishing Ready from In Progress for a human task — the
// vault status model has no native "in progress".
//
// `awaiting` is passed in because it lives on the board (AwaitingService), not on
// the item. It matters here: an item an agent picked up, worked, and handed back
// HAS been started — leaving it in Ready implies nobody has touched it, when in
// fact it is mid-flight and stalled on Marvin. Marvin, 2026-09-04: "if a vault
// item has been started, and then handed back then its in progress".
function laneForManual(item: VaultItem, awaiting = false): BoardLane {
  if (isDone(item))      return 'done';
  if (item.started_at)   return 'in_progress';
  // Handbacks get their own lane rather than sharing In Progress. Measured
  // 2026-09-04: 307 of them, which drowned the single actively-running
  // commission. They are also the only lane Marvin alone can clear — an agent
  // asked a question and cannot proceed until he answers.
  if (awaiting)          return 'waiting_on_you';
  // Checked before `unroutable` so a parked item reads as parked rather than as
  // a routing failure — deferral is a decision the orchestrator made, missing
  // skill is a decision nobody made.
  if (item.route === 'deferred') return 'deferred';
  return 'ready';
}

// One card per ITEM. Commission cards come from the per-item dispatch view-model;
// manual cards reuse the unified vault-card. `lane` and `sort` are precomputed so
// the column grouping + sort stay cheap and pure. `sort` is the SortableCard
// projection — a commission has no vault item of its own, so this is what lets
// both kinds share one comparator with the grooming board.
type BoardCard =
  | { readonly kind: 'commission'; readonly item: CommissionItem; readonly lane: BoardLane; readonly sort: SortableCard; readonly doneAt: string | null }
  | {
      readonly kind: 'manual'; readonly item: VaultItem; readonly lane: BoardLane;
      readonly blocked: boolean; readonly blockerLabel: string | null;
      /** An agent handed this back and is stalled behind it — not Marvin's own capture. */
      readonly awaiting: boolean;
      readonly sort: SortableCard; readonly doneAt: string | null;
    };

interface LaneView {
  lane:       BoardLane;
  label:      string;
  emptyLabel: string;
  /** Cards actually rendered — the head of the sorted lane, capped. */
  cards:      readonly BoardCard[];
  /** Cards the lane holds before the cap. Drives the header ratio + show-more. */
  total:      number;
}

// Which facets a count should ignore (so a facet's own selection doesn't collapse
// its counts to its active set).
interface FacetSkip { skipOwner?: boolean; skipProject?: boolean; skipPriority?: boolean; skipEpic?: boolean; skipReadiness?: boolean }

@Component({
  selector: 'app-execution-board',
  // GatesStrip omitted while <app-gates-strip> is commented out in the template.
  imports: [VaultCard, KanbanColumn, KanbanFilterBar, BoardCreateBar, UiButtonLink, AwaitingStrip],
  templateUrl: './execution-board.html',
  styleUrl: './execution-board.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'page-bleed' },
})
export class ExecutionBoard {
  private readonly dispatchService = inject(DispatchService);
  private readonly vaultItemsService = inject(VaultItemsService);
  private readonly vaultTypes = inject(VaultTypesService);
  private readonly commands = inject(VaultItemCommands);
  private readonly dispatchCommands = inject(DispatchCommands);
  private readonly vaultItemProjectsService = inject(VaultItemProjectsService);
  private readonly dependenciesService = inject(VaultItemDependenciesService);
  private readonly projectsService = inject(ProjectsService);
  private readonly actorsService = inject(ActorsService);
  private readonly shortcuts = inject(CommandShortcutsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly executionConfig = inject(ExecutionConfigService);
  // Read-only here: the strip owns the fetch. The board only needs to know
  // WHICH cards an agent is stalled behind, so it can mark them.
  private readonly awaitingService = inject(AwaitingService);

  // null = never auto-clear (default — matches pre-feature behavior).
  private readonly doneLaneAutoClearDays = computed(
    () => this.executionConfig.config()?.done_lane_auto_clear_days ?? null,
  );

  // --- drag state ---------------------------------------------------------
  // Only MANUAL cards drag (a human owns their lane); commission cards are
  // system-driven and stay put. getCurrentStatus reads a manual item's lane so
  // same-lane drops are refused.
  protected readonly drag = createKanbanDragState<VaultItemId, BoardLane>(
    id => {
      const item = this.vaultItemsService.getById(id);
      if (!item) return undefined;
      // Must pass `awaiting` too, or a handed-back card renders in In Progress
      // while the drag state thinks it is in Ready — and the same-lane-drop
      // refusal then fires on the wrong lane.
      return laneForManual(item, this.awaitingService.awaitingNoteIds().has(item.id as string));
    },
  );

  // --- filter state -------------------------------------------------------
  // Same facets as the grooming board (built via @shared/kanban/filter-groups).
  private readonly filter = createKanbanFilterState([PROJECT, OWNER, PRIORITY, EPIC, READINESS]);
  private readonly projectFilter   = this.filter.active<string>(PROJECT);
  private readonly ownerFilter     = this.filter.active<string>(OWNER);
  private readonly priorityFilter  = this.filter.active<number>(PRIORITY);
  private readonly epicFilter      = this.filter.active<string>(EPIC);
  private readonly readinessFilter = this.filter.active<string>(READINESS);

  private readonly _searchTerm = signal<string>('');
  readonly searchTerm = this._searchTerm.asReadonly();

  // Lane sort. Shares the grooming board's modes so "Oldest" means the same
  // thing on both. Commission cards have no vault item of their own, so the
  // board projects every card onto SortableCard before comparing.
  private readonly _sortMode = signal<SortMode>('priority');
  readonly sortMode = this._sortMode.asReadonly();
  readonly sortOptions = SORT_OPTIONS;

  // Per-lane render cap — same composable the grooming board uses. Done lanes
  // in particular accumulate without bound between auto-clear thresholds.
  protected readonly columnLimit = createKanbanColumnLimit();
  readonly limitOptions = COLUMN_LIMIT_OPTIONS;
  readonly activeLimit  = this.columnLimit.limit;

  readonly showMobileFilters = signal(false);
  private readonly _mobileLane = signal<BoardLane>('ready');
  readonly mobileLane = this._mobileLane.asReadonly();
  protected readonly hasActiveFilters = this.filter.hasActive;

  setMobileLane(lane: BoardLane): void {
    this._mobileLane.set(lane);
  }

  // --- sources ------------------------------------------------------------

  readonly visibleCommissions = computed(() =>
    this.dispatchService.commissions().filter(c =>
      this.commissionMatchesSearch(c) && this.matchesFacets(this.vaultItemsService.getById(c.taskId)),
    ),
  );

  // Task IDs that already have a commission dispatch (any stage). These render as
  // commission cards, so they must NOT also appear as a manual card (no double-show).
  private readonly commissionedTaskIds = computed(
    () => new Set(this.dispatchService.commissions().map(c => c.taskId as string)),
  );

  // Every LEAF item that belongs on the board as a MANUAL card — across all three
  // lanes (a manual card can be ready/in-progress/done). Two ways to qualify:
  //   • groomed-ready (any owner) — the agent-track holding pen the user asked to
  //     keep in Ready: a ready-but-not-yet-commissioned task.
  //   • human-owned — bypasses the grooming gate entirely (a person controls it
  //     manually, no Definition-of-Ready / acceptance-criteria required).
  // Excludes containers (epics — their children are the executable work) and
  // anything already commissioned (shown as a commission card instead).
  private readonly manualItems = computed(() => {
    const commissioned = this.commissionedTaskIds();
    const items = this.vaultItemsService.items();
    const isContainer = new Set(
      items.map(i => i.parent_id).filter((id): id is NonNullable<typeof id> => !!id),
    );
    return items.filter(item =>
      this.vaultTypes.isActionable(item.type) &&
      !isContainer.has(item.id) &&
      !commissioned.has(item.id as string) &&
      (
        (isActive(item) && item.grooming_status === 'ready') ||
        (this.isHumanOwned(item) && (isActive(item) || isDone(item)))
      ),
    );
  });

  /** How much of the dispatch table the agent cards are drawn from. */
  protected readonly dispatchWindow = this.dispatchService.window;

  // Live board: refresh the one item each stream event names, never the board.
  // Exposed so the header can say when the feed has dropped — a card that
  // silently stops updating is worse than one that admits it is stale.
  protected readonly live = withLiveBoardUpdates();

  constructor() {
    withVaultDetailModal();

    effect(() => {
      for (const c of this.dispatchService.commissions()) {
        this.vaultItemProjectsService.loadFor(c.taskId);
      }
    });

    // Load dependency edges for every manual card so blocked ones can be greyed.
    effect(() => {
      for (const item of this.manualItems()) {
        this.dependenciesService.loadFor(item.id);
      }
    });

    this.route.queryParamMap.pipe(take(1)).subscribe(params => {
      for (const id of (params.get(PROJECT)?.split(',').filter(Boolean) ?? [])) {
        this.filter.toggle(PROJECT, id);
      }
      for (const id of (params.get(OWNER)?.split(',').filter(Boolean) ?? [])) {
        this.filter.toggle(OWNER, id);
      }
      for (const raw of (params.get(PRIORITY)?.split(',').filter(Boolean) ?? [])) {
        const n = Number(raw);
        if (!Number.isNaN(n)) this.filter.toggle(PRIORITY, n);
      }
      for (const id of (params.get(EPIC)?.split(',').filter(Boolean) ?? [])) {
        this.filter.toggle(EPIC, id);
      }
      for (const id of (params.get(READINESS)?.split(',').filter(Boolean) ?? [])) {
        this.filter.toggle(READINESS, id);
      }
      const q = params.get('q');
      if (q) this._searchTerm.set(q);
      const limit = parseColumnLimit(params.get('limit'));
      if (limit !== undefined) this.columnLimit.setLimit(limit);
      const sort = params.get('sort');
      if (sort && SORT_OPTIONS.some(o => o.value === sort)) {
        this._sortMode.set(sort as SortMode);
      }
    });

    effect(() => {
      const projects   = Array.from(this.projectFilter());
      const owners     = Array.from(this.ownerFilter());
      const priorities = Array.from(this.priorityFilter());
      const epics      = Array.from(this.epicFilter());
      const readiness  = Array.from(this.readinessFilter());
      const q = this._searchTerm();
      const limit = this.columnLimit.limit();
      const sort = this._sortMode();
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {
          [PROJECT]:   projects.length   ? projects.join(',')   : null,
          [OWNER]:     owners.length     ? owners.join(',')     : null,
          [PRIORITY]:  priorities.length ? priorities.join(',') : null,
          [EPIC]:      epics.length      ? epics.join(',')      : null,
          [READINESS]: readiness.length  ? readiness.join(',')  : null,
          q:           q || null,
          limit:       serializeColumnLimit(limit),
          // Default stays out of the URL so a plain board link is the plain board.
          sort:        sort === 'priority' ? null : sort,
        },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    });
  }

  private readonly visibleManualItems = computed(() =>
    this.manualItems().filter(item => this.manualMatchesSearch(item) && this.matchesFacets(item)),
  );

  // Build every card (manual + commission) with its lane/priority/createdAt
  // precomputed, then group by lane and sort P0→P3 (lowest int first), newest
  // first on ties.
  readonly lanes = computed<LaneView[]>(() => {
    const cards: BoardCard[] = [];

    const awaitingIds = this.awaitingService.awaitingNoteIds();

    for (const item of this.visibleManualItems()) {
      const awaiting = awaitingIds.has(item.id as string);
      const lane     = laneForManual(item, awaiting);
      const blockers = this.dependenciesService.blockersFor(item.id)();
      const blocked  = lane === 'ready' && blockers.length > 0;
      cards.push({
        kind:        'manual',
        item,
        lane,
        blocked,
        blockerLabel: blocked ? `blocked · #${blockers[0].blocker_seq}` : null,
        awaiting,
        sort:        toSortableCard(item),
        doneAt:      item.completed_at,
      });
    }

    for (const c of this.visibleCommissions()) {
      const vi = this.vaultItemsService.getById(c.taskId);
      cards.push({
        kind:      'commission',
        item:      c,
        // No vault item loaded yet (the board's 5,000-row fetch is still in
        // flight) means we cannot tell reviewed from unreviewed — treat it as
        // still active, so a finished commission shows up for review rather
        // than silently landing in Done.
        lane:      laneForStage(c.stage, vi ? isActive(vi) : true),
        // A commission inherits its task's priority and identity, but its own
        // dispatch timestamp — the dispatch is what's moving, not the capture.
        sort: {
          priority:         vi ? effectivePriority(vi) : null,
          createdAt:        c.latest.created_at,
          seq:              vi?.seq ?? 0,
          latestActivityAt: c.latest.completed_at ?? c.latest.started_at ?? c.latest.created_at,
          daysInColumn:     vi?.days_in_column ?? null,
        },
        // Not every terminal stage guarantees completed_at (e.g. a rejected
        // commission never completes) — fall back through started_at to
        // created_at so every done/terminal card still gets a housekeeping
        // reference point for auto-clear.
        doneAt:    c.latest.completed_at ?? c.latest.started_at ?? c.latest.created_at,
      });
    }

    const autoClearDays = this.doneLaneAutoClearDays();
    const doneCutoffMs = autoClearDays !== null ? Date.now() - autoClearDays * 24 * 60 * 60 * 1000 : null;
    const comparator = compareSortableBy(this._sortMode());

    return LANE_ORDER.map(lane => {
      const all = cards
        .filter(card => card.lane === lane)
        // Auto-clear: hide (not delete) Done cards older than the configured
        // threshold. `doneCutoffMs === null` means the setting is unset —
        // nothing auto-clears, matching pre-feature behavior.
        .filter(card => {
          if (lane !== 'done' || doneCutoffMs === null) return true;
          if (!card.doneAt) return true;
          return new Date(card.doneAt).getTime() >= doneCutoffMs;
        })
        .sort((a, b) => comparator(a.sort, b.sort));
      return {
        lane,
        label:      LANE_LABELS[lane],
        emptyLabel: LANE_EMPTY[lane],
        // Cap AFTER the sort — the cap keeps the most urgent N, not an arbitrary N.
        cards:      this.columnLimit.take(lane, all),
        total:      all.length,
      };
    });
  });

  protected readonly isLoading = this.dispatchService.isLoading;

  // --- per-card derived data ---------------------------------------------

  projectForCommission(item: CommissionItem): ProjectRef | null {
    return this.resolveProject(item.taskId as string);
  }

  /**
   * Board-known markers handed to the card so they render inside it.
   *
   * `awaiting` stays louder than `blocked` for the same reason it always was:
   * blocked means this card waits on something else, awaiting means an agent
   * waits on Marvin.
   */
  manualFlags(card: Extract<BoardCard, { kind: 'manual' }>): readonly CardFlag[] {
    const flags: CardFlag[] = [];
    if (card.blocked && card.blockerLabel) flags.push({ label: card.blockerLabel, kind: 'blocked' });
    // The column already says "Waiting on you", so the pill only needs to say
    // the card cannot move. "handed back" described the event that caused it,
    // which is one word of history the reader does not need twice.
    if (card.awaiting) flags.push({ label: 'blocked', kind: 'awaiting' });
    return flags;
  }

  cardContextForManual(item: VaultItem): CardContext {
    const ctx: ManualCardContext = {
      kind: 'manual',
      item,
      project: this.resolveProject(item.id as string),
      owner: item.assigned_to ?? null,
      parentEpic: this.parentRef(item.parent_id),
      source: this.sourceLabelFor(item),
      lastActivityAt: item.latest_activity_at ?? item.created_at,
      sourceKind: item.source?.kind ?? null,
      sourceUrl: item.source?.url ?? null,
    };
    return ctx;
  }

  /**
   * Dispatch context for a commission, so it renders through `app-vault-card`
   * like everything else.
   *
   * The board ran two card components for the same job until 2026-09-04 —
   * `app-commission-card` in In Progress/Done and `app-vault-card` everywhere
   * else — which meant two headers, two title treatments and two action
   * footers for cards sitting side by side. Marvin: "feels like we should only
   * have 1". Everything commission-specific (stage pill, PR link, failure text,
   * the xN history expander) moved onto the dispatch branch of the shared card.
   */
  cardContextForCommission(c: CommissionItem): CardContext {
    const item = this.vaultItemsService.getById(c.taskId) ?? null;
    const ctx: DispatchCardContext = {
      kind: 'dispatch',
      entry: c.latest,
      item,
      project: this.projectForCommission(c),
      owner: c.executor,
      skillDisplayName: null,
      parentEpic: this.parentRef(item?.parent_id ?? null),
      // The entry carries no model — that lives on the activity event, which the
      // board does not load. Null is honest here; the card omits the chip.
      modelId: null,
      genesis: null,
      stage: c.stage,
      history: c.history,
      taskTitle: c.taskTitle,
      taskSeq: c.taskSeq,
    };
    return ctx;
  }

  // Track key for the @for — stable per card regardless of lane moves.
  cardKey(card: BoardCard): string {
    return card.kind === 'commission' ? `c:${card.item.taskId}` : `m:${card.item.id}`;
  }

  private isHumanOwned(item: VaultItem): boolean {
    if (!item.assigned_to) return false;
    return this.actorsService.getById(item.assigned_to)?.kind === 'human';
  }

  /**
   * The card's parent, for the band's epic chip.
   *
   * This board passed null here since the chip's slot existed, so an item whose
   * parent IS an epic — most of them — rendered as though it had none. Mirrors
   * the grooming board's `parentRef`; `getById` is a lookup on a memoized map,
   * so this stays cheap enough for a method the template calls per card.
   */
  private parentRef(parentId: string | null): ParentEpicRef | null {
    if (!parentId) return null;
    const parent = this.vaultItemsService.getById(parentId as VaultItemId);
    return parent ? { seq: parent.seq, title: parent.title } : null;
  }

  private resolveProject(id: string): ProjectRef | null {
    // Prefer the board API's resolved primary project. It already walks the
    // parent chain server-side, so an inherited subtask (one with no junction
    // row of its own) still shows its epic's project bar. Junction links are a
    // fallback for items the board embed doesn't carry (e.g. commission lookups
    // by taskId not present in the board set).
    const item = this.vaultItemsService.getById(id as never);
    if (item?.primary_project_id && item.primary_project_name) {
      const proj = this.projectsService.getById(item.primary_project_id as never);
      return {
        id: item.primary_project_id as string,
        display_name: item.primary_project_name as string,
        color_token: proj?.color_token ?? null,
        short_code: proj?.short_code ?? null,
      };
    }
    const links = this.vaultItemProjectsService.projectsFor(id as never)();
    if (!links.length) return null;
    const project = this.projectsService.getById(links[0].project_id);
    return project
      ? { id: project.id as string, display_name: project.display_name, color_token: project.color_token, short_code: project.short_code }
      : null;
  }

  // Project membership for the facet count + filter. Unions the item's direct
  // junction links with its resolved primary project (the board API has already
  // walked the parent chain), so an inherited subtask matches a project filter
  // and counts toward that facet — the same project the card bar now shows.
  private projectLinksFor(item: VaultItem): { project_id: string }[] {
    const ids = new Set(this.vaultItemProjectsService.projectsFor(item.id)().map(l => l.project_id as string));
    if (item.primary_project_id) ids.add(item.primary_project_id as string);
    return [...ids].map(project_id => ({ project_id }));
  }

  private sourceLabelFor(item: VaultItem): SourceLabel | null {
    const src = item.source;
    if (!src) return null;
    if (src.kind === 'agent')      return { text: `by @${src.ref}`, actorId: src.ref };
    if (src.kind === 'manual')     return { text: 'manual', actorId: null };
    if (src.kind === 'pr-comment') return { text: 'via PR comment', actorId: null };
    return { text: `via ${src.kind}`, actorId: null };
  }

  // --- mutations ----------------------------------------------------------

  /**
   * Bridge from the shared card's `ActionKey` to the commission actions.
   *
   * `dispatchActions()` in vault-card only ever emits retry / archive / dismiss
   * for a dispatch card, which is exactly the CommissionAction set — but the
   * types are separate unions, so the narrowing is explicit rather than a cast.
   */
  onCommissionCardAction(item: CommissionItem, key: ActionKey): void {
    if (key === 'retry' || key === 'archive' || key === 'dismiss') {
      this.onCommissionAction(item, key);
    }
  }

  onCommissionAction(item: CommissionItem, key: CommissionAction): void {
    const entry = item.latest;
    switch (key) {
      case 'retry':   this.dispatchService.retry(entry.id); return;
      case 'dismiss': this.dispatchCommands.dismiss(entry.id); return;
      case 'archive': this.dispatchCommands.archiveTaskAndDismiss(entry); return;
    }
  }

  onOpenCommission(item: CommissionItem): void {
    if (item.taskSeq !== null) swapDetailSeq(this.router, item.taskSeq);
  }

  onManualAction(item: VaultItem, key: ActionKey): void {
    if (key === 'markDone') this.commands.complete(item.id);
  }

  onCreateManualItem(): void {
    this.shortcuts.openManualCapture();
  }

  // Column-level "dismiss all completed" on the Done lane: hard-deletes completed
  // dispatch rows. Count is the terminal commissions in the lane.
  onClearCompleted(): void {
    const count = this.doneCommissionCount();
    if (count === 0) return;
    if (!window.confirm(`Dismiss all ${count} completed commissions? They are hidden, not deleted — the runs and their verdicts are kept.`)) return;
    this.dispatchCommands.clearCompleted();
  }

  doneCommissionCount(): number {
    return this.lanes()
      .find(l => l.lane === 'done')?.cards
      .filter(c => c.kind === 'commission').length ?? 0;
  }

  // --- drag & drop --------------------------------------------------------
  // Only manual cards bind these. Dropping into a lane translates to the matching
  // manual-track command: Ready clears progress/completion, In Progress stamps
  // started_at, Done marks complete.

  onCardDragStart(event: DragEvent, item: VaultItem): void {
    this.drag.onDragStart(event, item.id);
  }
  onCardDragEnd(): void { this.drag.onDragEnd(); }
  onLaneDragOver(event: DragEvent, lane: BoardLane): void {
    this.drag.onDragOver(event, lane);
  }
  onLaneDragLeave(lane: BoardLane): void { this.drag.onDragLeave(lane); }

  onLaneDrop(event: DragEvent, lane: BoardLane): void {
    const id = this.drag.onDrop(event, lane);
    if (!id) return;
    switch (lane) {
      case 'ready':       this.commands.moveToReady(id); return;
      case 'in_progress': this.commands.startWork(id);   return;
      case 'done':        this.commands.complete(id);    return;
      // Three lanes a drag cannot produce, each for its own reason:
      //   deferred       — the orchestrator's saturation decision, not a gesture
      //   waiting_on_you — set by an agent handing work back, not by Marvin
      //   review         — reached by an agent completing a commission
      // Silently doing nothing on drop is worse than refusing, so they are
      // listed rather than falling through the switch.
      case 'deferred':
      case 'waiting_on_you':
      case 'review':      return;
    }
  }

  isDragging(card: BoardCard): boolean {
    return card.kind === 'manual' && this.drag.dragging() === card.item.id;
  }

  // --- filter groups ------------------------------------------------------
  // Same Project / Owner / Priority facets as the grooming board — built by the
  // shared @shared/kanban/filter-groups helpers. Each facet's counts come from
  // the board's vault items filtered by every OTHER facet (the skip flag).
  readonly filterGroups = computed<FilterGroup[]>(() => {
    const groups: FilterGroup[] = [
      projectFilterGroup(
        this.facetItems({ skipProject: true }),
        this.projectFilter(),
        this.projectsService.activeProjects(),
        item => this.projectLinksFor(item),
      ),
      ownerFilterGroup(
        this.facetItems({ skipOwner: true }),
        this.ownerFilter(),
        this.actorsService.activeActors().map(a => a.id as string),
      ),
      priorityFilterGroup(
        this.facetItems({ skipPriority: true }),
        this.priorityFilter(),
      ),
      // The Ready lane admits anything human-owned regardless of grooming state,
      // so this is the only way to see the DoR-passing subset on its own.
      readinessFilterGroup(
        this.facetItems({ skipReadiness: true }),
        this.readinessFilter(),
      ),
    ];
    // Epic facet is a drill-down of the project selection — it only appears
    // once a project is chosen, and only if that project actually has epics.
    const epics = this.selectableEpics();
    if (epics.length > 0) {
      groups.push(epicFilterGroup(this.facetItems({ skipEpic: true }), this.epicFilter(), epics));
    }
    return groups;
  });

  private readonly selectableEpics = computed(() =>
    epicsForProjects(
      this.vaultItemsService.items(),
      this.projectFilter(),
      item => this.projectLinksFor(item),
    ),
  );

  private readonly selectableEpicIds = computed(
    () => new Set(this.selectableEpics().map(e => e.id as string)),
  );

  // The selection that actually filters — raw ∩ offered options. Derived, so a
  // hidden facet (no project selected, epic archived, stale URL param) never
  // silently filters the board; the raw set survives to be restored later.
  private readonly effectiveEpicFilter = computed(
    () => effectiveEpicSelection(this.epicFilter(), this.selectableEpics()),
  );

  // Anything that changes a lane's contents also collapses the per-lane
  // expansions — a "show more" granted against the old visible set shouldn't
  // silently carry into a new one.
  onFilterToggle(event: { groupId: string; value: string | number }): void {
    this.filter.toggle(event.groupId, event.value);
    this.columnLimit.collapseAll();
  }

  onSearchChange(term: string): void {
    this._searchTerm.set(term);
    this.columnLimit.collapseAll();
  }

  onLimitChange(limit: number | null): void { this.columnLimit.setLimit(limit); }

  onSortChange(mode: string): void {
    this._sortMode.set(mode as SortMode);
    // A new order makes per-column expansions meaningless — the cap should be
    // the top N of the order you just picked, not the top N of the last one.
    this.columnLimit.collapseAll();
  }

  onShowMore(lane: BoardLane): void { this.columnLimit.showMore(lane); }

  resetFilters(): void {
    this.filter.reset();
    this._searchTerm.set('');
    // Cap itself survives — it's a view-density preference, not a filter.
    this.columnLimit.collapseAll();
  }

  // --- internal: filtering -----------------------------------------------

  // The vault items represented on the board — manual cards plus each commission's
  // underlying task — passed to the shared facet builders. Filtered by search and
  // every facet except the one whose counts we're computing. Manual and commission
  // task ids never overlap (commissioned items are excluded from manualItems).
  private facetItems(skip: FacetSkip): VaultItem[] {
    const out: VaultItem[] = [];
    for (const m of this.manualItems()) {
      if (this.manualMatchesSearch(m) && this.matchesFacets(m, skip)) out.push(m);
    }
    for (const c of this.dispatchService.commissions()) {
      const vi = this.vaultItemsService.getById(c.taskId);
      if (vi && this.commissionMatchesSearch(c) && this.matchesFacets(vi, skip)) out.push(vi);
    }
    return out;
  }

  // Owner / priority / project facet predicate over a vault item — the unit both
  // boards filter on (a commission passes its underlying task). Owner = assigned_to,
  // matching grooming; the agent executor still shows on the commission card pill.
  private matchesFacets(item: VaultItem | null | undefined, skip: FacetSkip = {}): boolean {
    const ownerF = this.ownerFilter();
    const projF  = this.projectFilter();
    const priF   = this.priorityFilter();
    const epicF  = this.effectiveEpicFilter();
    const readyF = this.readinessFilter();

    if (!skip.skipOwner && ownerF.size > 0) {
      const key = (item?.assigned_to ?? UNASSIGNED) as string;
      if (!ownerF.has(key)) return false;
    }
    if (!skip.skipPriority && priF.size > 0) {
      const eff = item ? effectivePriority(item) : null;
      const key = eff === null ? NO_PRIORITY : eff;
      if (!priF.has(key)) return false;
    }
    if (!skip.skipProject && projF.size > 0) {
      const links = item ? this.projectLinksFor(item) : [];
      if (!links.some(l => projF.has(l.project_id as string))) return false;
    }
    if (!skip.skipEpic && epicF.size > 0) {
      if (!item || !epicF.has(epicKeyOf(item, this.selectableEpicIds()))) return false;
    }
    if (!skip.skipReadiness && readyF.size > 0) {
      if (!item || !readyF.has(readinessKeyOf(item))) return false;
    }
    return true;
  }

  private manualMatchesSearch(item: VaultItem): boolean {
    const search = this._searchTerm().trim().toLowerCase();
    if (!search) return true;
    return [item.seq, item.title, item.assigned_to ?? ''].join(' ').toLowerCase().includes(search);
  }

  private commissionMatchesSearch(c: CommissionItem): boolean {
    const search = this._searchTerm().trim().toLowerCase();
    if (!search) return true;
    return [c.taskSeq ?? '', c.taskTitle ?? '', c.executor ?? '', c.latest.skill].join(' ').toLowerCase().includes(search);
  }
}
