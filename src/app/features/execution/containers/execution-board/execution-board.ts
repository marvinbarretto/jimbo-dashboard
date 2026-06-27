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
import type { ActorId, VaultItemId } from '@domain/ids';
import { VaultCard, type ActionKey } from '@shared/components/vault-card/vault-card';
import { CommissionCard, type CommissionAction } from '@features/execution/components/commission-card/commission-card';
import type { CardContext, ManualCardContext, ProjectRef, SourceLabel } from '@shared/components/vault-card/card-context';
import { KanbanColumn } from '@shared/components/kanban-column/kanban-column';
import { KanbanFilterBar, type FilterGroup, type FilterOption } from '@shared/components/kanban-filter-bar/kanban-filter-bar';
import { BoardCreateBar } from '@shared/components/board-create-bar/board-create-bar';
import { createKanbanFilterState } from '@shared/kanban/filter-state';
import { createKanbanDragState } from '@shared/kanban/drag-state';
import { withVaultDetailModal, swapDetailSeq } from '@shared/kanban/detail-modal';
import { CommandShortcutsService } from '@shared/services/command-shortcuts.service';
import { effectivePriority, isActive, isDone, type VaultItem } from '@domain/vault';

const EXECUTOR = 'executor';
const PROJECT  = 'project';

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
type BoardLane = 'ready' | 'in_progress' | 'done';
const LANE_ORDER: readonly BoardLane[] = ['ready', 'in_progress', 'done'];

const LANE_LABELS: Record<BoardLane, string> = {
  ready:       'Ready',
  in_progress: 'In Progress',
  done:        'Done',
};

const LANE_EMPTY: Record<BoardLane, string> = {
  ready:       'Nothing ready',
  in_progress: 'Nothing in progress',
  done:        'Nothing done',
};

// Map a commission's stage onto a lane. Agent cards are system-driven: their lane
// follows the dispatch, so they're not draggable.
function laneForStage(stage: CommissionStage): BoardLane {
  switch (stage) {
    case 'proposed':  return 'ready';        // awaiting operator approval
    case 'approved':
    case 'running':
    case 'pr_open':   return 'in_progress';  // greenlit and moving
    case 'merged':
    case 'completed':
    case 'failed':
    case 'rejected':  return 'done';         // terminal (failed/rejected = red pill)
  }
}

// Map a manual (human-track) item onto a lane from its own state. started_at is
// the only thing distinguishing Ready from In Progress for a human task — the
// vault status model has no native "in progress".
function laneForManual(item: VaultItem): BoardLane {
  if (isDone(item))      return 'done';
  if (item.started_at)   return 'in_progress';
  return 'ready';
}

// Lowest-integer-wins priority for sort; null (no priority) sinks to the bottom.
const PRIORITY_FLOOR = 99;

// One card per ITEM. Commission cards come from the per-item dispatch view-model;
// manual cards reuse the unified vault-card. `lane`, `priority` and `createdAt`
// are precomputed so the column grouping + sort stay cheap and pure.
type BoardCard =
  | { readonly kind: 'commission'; readonly item: CommissionItem; readonly lane: BoardLane; readonly priority: number; readonly createdAt: string }
  | { readonly kind: 'manual'; readonly item: VaultItem; readonly lane: BoardLane; readonly blocked: boolean; readonly blockerLabel: string | null; readonly priority: number; readonly createdAt: string };

interface LaneView {
  lane:       BoardLane;
  label:      string;
  emptyLabel: string;
  cards:      BoardCard[];
}

@Component({
  selector: 'app-execution-board',
  imports: [VaultCard, CommissionCard, KanbanColumn, KanbanFilterBar, BoardCreateBar],
  templateUrl: './execution-board.html',
  styleUrl: './execution-board.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'page-bleed' },
})
export class ExecutionBoard {
  private readonly dispatchService = inject(DispatchService);
  private readonly vaultItemsService = inject(VaultItemsService);
  private readonly commands = inject(VaultItemCommands);
  private readonly dispatchCommands = inject(DispatchCommands);
  private readonly vaultItemProjectsService = inject(VaultItemProjectsService);
  private readonly dependenciesService = inject(VaultItemDependenciesService);
  private readonly projectsService = inject(ProjectsService);
  private readonly actorsService = inject(ActorsService);
  private readonly shortcuts = inject(CommandShortcutsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  // --- drag state ---------------------------------------------------------
  // Only MANUAL cards drag (a human owns their lane); commission cards are
  // system-driven and stay put. getCurrentStatus reads a manual item's lane so
  // same-lane drops are refused.
  protected readonly drag = createKanbanDragState<VaultItemId, BoardLane>(
    id => {
      const item = this.vaultItemsService.getById(id);
      return item ? laneForManual(item) : undefined;
    },
  );

  // --- filter state -------------------------------------------------------
  private readonly filter = createKanbanFilterState([EXECUTOR, PROJECT]);
  private readonly executorFilter = this.filter.active<string>(EXECUTOR);
  private readonly projectFilter  = this.filter.active<string>(PROJECT);

  private readonly _searchTerm = signal<string>('');
  readonly searchTerm = this._searchTerm.asReadonly();

  readonly showMobileFilters = signal(false);
  private readonly _mobileLane = signal<BoardLane>('ready');
  readonly mobileLane = this._mobileLane.asReadonly();
  protected readonly hasActiveFilters = this.filter.hasActive;

  setMobileLane(lane: BoardLane): void {
    this._mobileLane.set(lane);
  }

  // --- sources ------------------------------------------------------------

  readonly visibleCommissions = computed(() => this.applyCommissionFilters());

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
      item.type === 'task' &&
      !isContainer.has(item.id) &&
      !commissioned.has(item.id as string) &&
      (
        (isActive(item) && item.grooming_status === 'ready') ||
        (this.isHumanOwned(item) && (isActive(item) || isDone(item)))
      ),
    );
  });

  // Load dependency edges for every manual card so blocked ones can be greyed.
  // Bounded to the board's own item set (small) — mirrors the grooming board's
  // per-item parallel loads.
  constructor() {
    withVaultDetailModal();

    effect(() => {
      for (const c of this.dispatchService.commissions()) {
        this.vaultItemProjectsService.loadFor(c.taskId);
      }
    });

    effect(() => {
      for (const item of this.manualItems()) {
        this.dependenciesService.loadFor(item.id);
      }
    });

    this.route.queryParamMap.pipe(take(1)).subscribe(params => {
      for (const id of (params.get(EXECUTOR)?.split(',').filter(Boolean) ?? [])) {
        this.filter.toggle(EXECUTOR, id);
      }
      for (const id of (params.get(PROJECT)?.split(',').filter(Boolean) ?? [])) {
        this.filter.toggle(PROJECT, id);
      }
      const q = params.get('q');
      if (q) this._searchTerm.set(q);
    });

    effect(() => {
      const executors = Array.from(this.executorFilter());
      const projects  = Array.from(this.projectFilter());
      const q = this._searchTerm();
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {
          [EXECUTOR]: executors.length ? executors.join(',') : null,
          [PROJECT]:  projects.length  ? projects.join(',')  : null,
          q:          q || null,
        },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    });
  }

  private readonly visibleManualItems = computed(() =>
    this.manualItems().filter(item => this.matchesManual(item)),
  );

  // Build every card (manual + commission) with its lane/priority/createdAt
  // precomputed, then group by lane and sort P0→P3 (lowest int first), newest
  // first on ties.
  readonly lanes = computed<LaneView[]>(() => {
    const cards: BoardCard[] = [];

    for (const item of this.visibleManualItems()) {
      const blockers = this.dependenciesService.blockersFor(item.id)();
      const blocked  = laneForManual(item) === 'ready' && blockers.length > 0;
      cards.push({
        kind:        'manual',
        item,
        lane:        laneForManual(item),
        blocked,
        blockerLabel: blocked ? `blocked · #${blockers[0].blocker_seq}` : null,
        priority:    effectivePriority(item) ?? PRIORITY_FLOOR,
        createdAt:   item.created_at,
      });
    }

    for (const c of this.visibleCommissions()) {
      const vi = this.vaultItemsService.getById(c.taskId);
      cards.push({
        kind:      'commission',
        item:      c,
        lane:      laneForStage(c.stage),
        priority:  (vi ? effectivePriority(vi) : null) ?? PRIORITY_FLOOR,
        createdAt: c.latest.created_at,
      });
    }

    return LANE_ORDER.map(lane => ({
      lane,
      label:      LANE_LABELS[lane],
      emptyLabel: LANE_EMPTY[lane],
      cards: cards
        .filter(card => card.lane === lane)
        .sort((a, b) => a.priority - b.priority || b.createdAt.localeCompare(a.createdAt)),
    }));
  });

  protected readonly isLoading = this.dispatchService.isLoading;

  // --- per-card derived data ---------------------------------------------

  projectForCommission(item: CommissionItem): ProjectRef | null {
    return this.resolveProject(item.taskId as string);
  }

  cardContextForManual(item: VaultItem): CardContext {
    const ctx: ManualCardContext = {
      kind: 'manual',
      item,
      project: this.resolveProject(item.id as string),
      owner: item.assigned_to ?? null,
      parentEpic: null,
      source: this.sourceLabelFor(item),
      lastActivityAt: item.latest_activity_at ?? item.created_at,
      sourceKind: item.source?.kind ?? null,
      sourceUrl: item.source?.url ?? null,
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

  private resolveProject(id: string): ProjectRef | null {
    const links = this.vaultItemProjectsService.projectsFor(id as never)();
    if (!links.length) return null;
    const project = this.projectsService.getById(links[0].project_id);
    return project
      ? { id: project.id as string, display_name: project.display_name, color_token: project.color_token }
      : null;
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
    const count = this.lanes()
      .find(l => l.lane === 'done')?.cards
      .filter(c => c.kind === 'commission').length ?? 0;
    if (count === 0) return;
    if (!window.confirm(`Dismiss all ${count} completed commissions? This cannot be undone.`)) return;
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
    }
  }

  isDragging(card: BoardCard): boolean {
    return card.kind === 'manual' && this.drag.dragging() === card.item.id;
  }

  // --- filter groups ------------------------------------------------------

  readonly filterGroups = computed<FilterGroup[]>(() => [
    this.buildExecutorGroup(),
    this.buildProjectGroup(),
  ]);

  // Owner facet spans BOTH tracks now the board is unified: a commission's
  // executor (agent) and a manual card's assigned_to (human). Building it from
  // commissions alone is why "only boris" showed when every Ready card is a
  // human-owned manual task.
  private buildExecutorGroup(): FilterGroup<string> {
    const counts = new Map<string, number>();
    for (const c of this.applyCommissionFilters({ skipExecutor: true })) {
      if (c.executor != null) counts.set(c.executor, (counts.get(c.executor) ?? 0) + 1);
    }
    for (const m of this.applyManualFilters({ skipExecutor: true })) {
      if (m.assigned_to != null) counts.set(m.assigned_to as string, (counts.get(m.assigned_to as string) ?? 0) + 1);
    }
    // Options = every actor that owns a manual card or a commission on this board.
    const ids = new Set<string>();
    for (const c of this.dispatchService.commissions()) if (c.executor != null) ids.add(c.executor as string);
    for (const m of this.manualItems()) if (m.assigned_to != null) ids.add(m.assigned_to as string);
    const options: FilterOption<string>[] = Array.from(ids).map(id => ({
      value:      id,
      label:      id,
      count:      counts.get(id) ?? 0,
      entityType: 'actor' as const,
    })).sort((a, b) => a.label.localeCompare(b.label));
    return { id: EXECUTOR, label: 'Owner', options, active: this.executorFilter() };
  }

  private buildProjectGroup(): FilterGroup<string> {
    const counts = new Map<string, number>();
    for (const c of this.applyCommissionFilters({ skipProject: true })) {
      for (const l of this.vaultItemProjectsService.projectsFor(c.taskId)()) {
        counts.set(l.project_id as string, (counts.get(l.project_id as string) ?? 0) + 1);
      }
    }
    for (const m of this.applyManualFilters({ skipProject: true })) {
      for (const l of this.vaultItemProjectsService.projectsFor(m.id)()) {
        counts.set(l.project_id as string, (counts.get(l.project_id as string) ?? 0) + 1);
      }
    }
    const options: FilterOption<string>[] = this.projectsService.activeProjects().map(p => ({
      value:      p.id as string,
      label:      p.display_name,
      count:      counts.get(p.id as string) ?? 0,
      entityType: 'project' as const,
      color:      p.color_token,
    }));
    return { id: PROJECT, label: 'Project', options, active: this.projectFilter() };
  }

  onFilterToggle(event: { groupId: string; value: string | number }): void {
    this.filter.toggle(event.groupId, event.value);
  }

  onSearchChange(term: string): void { this._searchTerm.set(term); }

  resetFilters(): void {
    this.filter.reset();
    this._searchTerm.set('');
  }

  // --- internal: filtering -----------------------------------------------

  private applyCommissionFilters(opts: { skipExecutor?: boolean; skipProject?: boolean } = {}): CommissionItem[] {
    const execF  = this.executorFilter();
    const projF  = this.projectFilter();
    const search = this._searchTerm().trim().toLowerCase();

    return this.dispatchService.commissions().filter(c => {
      if (search) {
        const haystack = [c.taskSeq ?? '', c.taskTitle ?? '', c.executor ?? '', c.latest.skill]
          .join(' ').toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      if (!opts.skipExecutor && execF.size > 0) {
        if (c.executor == null || !execF.has(c.executor)) return false;
      }
      if (!opts.skipProject && projF.size > 0) {
        const links = this.vaultItemProjectsService.projectsFor(c.taskId)();
        if (!links.some(l => projF.has(l.project_id as string))) return false;
      }
      return true;
    });
  }

  private applyManualFilters(opts: { skipExecutor?: boolean; skipProject?: boolean } = {}): VaultItem[] {
    return this.manualItems().filter(item => this.matchesManual(item, opts));
  }

  // Manual cards honour the same facets (assigned_to as their "owner"). Skips
  // mirror applyCommissionFilters so a facet's own counts don't collapse to its
  // active selection.
  private matchesManual(item: VaultItem, opts: { skipExecutor?: boolean; skipProject?: boolean } = {}): boolean {
    const execF  = this.executorFilter();
    const projF  = this.projectFilter();
    const search = this._searchTerm().trim().toLowerCase();

    if (search) {
      const haystack = [item.seq, item.title, item.assigned_to ?? ''].join(' ').toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    if (!opts.skipExecutor && execF.size > 0) {
      const owner: ActorId | null = item.assigned_to ?? null;
      if (owner == null || !execF.has(owner)) return false;
    }
    if (!opts.skipProject && projF.size > 0) {
      const links = this.vaultItemProjectsService.projectsFor(item.id)();
      if (!links.some(l => projF.has(l.project_id as string))) return false;
    }
    return true;
  }
}
