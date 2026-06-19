import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { take } from 'rxjs';
import { DispatchService } from '@features/execution/data-access/dispatch.service';
import { VaultItemsService } from '@features/vault-items/data-access/vault-items.service';
import { VaultItemCommands } from '@features/vault-items/commands/vault-item-commands';
import { DispatchCommands } from '@features/execution/commands/dispatch-commands';
import { VaultItemProjectsService } from '@features/vault-items/data-access/vault-item-projects.service';
import { ProjectsService } from '@features/projects/data-access/projects.service';
import { ActorsService } from '@features/actors/data-access/actors.service';
import {
  COMMISSION_STAGE_ORDER,
  COMMISSION_STAGE_LABELS,
  type CommissionItem,
  type CommissionStage,
} from '@domain/dispatch';
import type { ActorId } from '@domain/ids';
import { VaultCard, type ActionKey } from '@shared/components/vault-card/vault-card';
import { CommissionCard, type CommissionAction } from '@features/execution/components/commission-card/commission-card';
import type { CardContext, ManualCardContext, ProjectRef, SourceLabel } from '@shared/components/vault-card/card-context';
import { KanbanColumn } from '@shared/components/kanban-column/kanban-column';
import { KanbanFilterBar, type FilterGroup, type FilterOption } from '@shared/components/kanban-filter-bar/kanban-filter-bar';
import { BoardCreateBar } from '@shared/components/board-create-bar/board-create-bar';
import { createKanbanFilterState } from '@shared/kanban/filter-state';
import { withVaultDetailModal, swapDetailSeq } from '@shared/kanban/detail-modal';
import { CommandShortcutsService } from '@shared/services/command-shortcuts.service';
import { isActive, type VaultItem } from '@domain/vault';

const EXECUTOR = 'executor';
const PROJECT  = 'project';

// Manual operator-owned tasks get a leading lane, kept distinct from the
// commission pipeline (they bypass agent dispatch entirely). Columns are
// otherwise the honest commission stages, left→shipped.
type BoardColumn = 'manual' | CommissionStage;
const COLUMN_ORDER: readonly BoardColumn[] = ['manual', ...COMMISSION_STAGE_ORDER];

const COLUMN_LABELS: Record<BoardColumn, string> = {
  manual: 'Manual / Ready',
  ...COMMISSION_STAGE_LABELS,
};

const COLUMN_EMPTY: Record<BoardColumn, string> = {
  manual:    'No manual items',
  proposed:  'Nothing awaiting approval',
  approved:  'Nothing queued',
  running:   'Nothing running',
  pr_open:   'No open PRs',
  merged:    'Nothing merged',
  completed: 'Nothing completed',
  failed:    'No failures',
  rejected:  'Nothing rejected',
};

// One card per ITEM. Commission cards come from the per-item view-model; manual
// items reuse the unified vault-card (operator track, unchanged behaviour).
type BoardCard =
  | { readonly kind: 'commission'; readonly item: CommissionItem }
  | { readonly kind: 'manual';     readonly item: VaultItem };

interface ColumnView {
  status:        BoardColumn;
  label:         string;
  emptyLabel:    string;
  cards:         BoardCard[];
  systemManaged: boolean;
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
  private readonly projectsService = inject(ProjectsService);
  private readonly actorsService = inject(ActorsService);
  private readonly shortcuts = inject(CommandShortcutsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  // Read-only board: the only mutations are operator retry/dismiss/archive on a
  // commission, or mark-done on a manual item. No drag-drop.

  // --- filter state -------------------------------------------------------
  // Skill filter dropped vs the old per-dispatch board: this board is
  // commission-only, so skill is ~always code/pr-from-issue and the facet is
  // dead weight. Executor + project remain.
  private readonly filter = createKanbanFilterState([EXECUTOR, PROJECT]);
  private readonly executorFilter = this.filter.active<string>(EXECUTOR);
  private readonly projectFilter  = this.filter.active<string>(PROJECT);

  private readonly _searchTerm = signal<string>('');
  readonly searchTerm = this._searchTerm.asReadonly();

  readonly showMobileFilters = signal(false);
  private readonly _mobileColumn = signal<BoardColumn>('completed');
  readonly mobileColumn = this._mobileColumn.asReadonly();
  protected readonly hasActiveFilters = this.filter.hasActive;

  setMobileColumn(status: BoardColumn): void {
    this._mobileColumn.set(status);
  }

  // --- sources ------------------------------------------------------------

  readonly visibleCommissions = computed(() => this.applyCommissionFilters());

  // Operator-managed tasks that bypass agent dispatch (created straight to
  // grooming_status='ready'). Preserved as a distinct lane — they have no
  // dispatch rows so they can never appear in `commissions()`.
  private readonly manualItems = computed(() =>
    this.vaultItemsService.items().filter(item =>
      item.type === 'task' &&
      isActive(item) &&
      item.grooming_status === 'ready' &&
      item.source?.kind === 'manual',
    ).sort((a, b) => b.created_at.localeCompare(a.created_at)),
  );

  private readonly visibleManualItems = computed(() =>
    this.manualItems().filter(item => this.matchesManual(item)),
  );

  readonly columns = computed<ColumnView[]>(() => {
    const comms = this.visibleCommissions();
    const manuals = this.visibleManualItems();
    return COLUMN_ORDER.map(col => {
      const cards: BoardCard[] = col === 'manual'
        ? manuals.map(item => ({ kind: 'manual', item }))
        : comms.filter(c => c.stage === col).map(item => ({ kind: 'commission', item }));
      return {
        status:        col,
        label:         COLUMN_LABELS[col],
        emptyLabel:    COLUMN_EMPTY[col],
        systemManaged: col === 'running',
        cards,
      };
    });
  });

  protected readonly isLoading = this.dispatchService.isLoading;

  constructor() {
    withVaultDetailModal();

    // Pre-load project junctions for every commission so the project chip
    // resolves synchronously.
    effect(() => {
      for (const c of this.dispatchService.commissions()) {
        this.vaultItemProjectsService.loadFor(c.taskId);
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

  // Commission actions target the item's latest dispatch — the same handlers the
  // old per-dispatch board used, so retry/dismiss/archive behaviour is unchanged.
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

  // Column-level "dismiss all completed": hard-deletes completed dispatch rows.
  onClearCompleted(count: number): void {
    if (count === 0) return;
    if (!window.confirm(`Dismiss all ${count} completed commissions? This cannot be undone.`)) return;
    this.dispatchCommands.clearCompleted();
  }

  // --- filter groups ------------------------------------------------------

  readonly filterGroups = computed<FilterGroup[]>(() => [
    this.buildExecutorGroup(),
    this.buildProjectGroup(),
  ]);

  private buildExecutorGroup(): FilterGroup<string> {
    const items = this.applyCommissionFilters({ skipExecutor: true });
    const counts = new Map<string, number>();
    for (const c of items) {
      if (c.executor == null) continue;
      counts.set(c.executor, (counts.get(c.executor) ?? 0) + 1);
    }
    const executorIds = new Set<string>(
      this.dispatchService.commissions()
        .map(c => c.executor)
        .filter((id): id is NonNullable<typeof id> => id != null),
    );
    const options: FilterOption<string>[] = Array.from(executorIds).map(id => ({
      value:      id,
      label:      id,
      count:      counts.get(id) ?? 0,
      entityType: 'actor' as const,
    })).sort((a, b) => a.label.localeCompare(b.label));
    return { id: EXECUTOR, label: 'Executor', options, active: this.executorFilter() };
  }

  private buildProjectGroup(): FilterGroup<string> {
    const items = this.applyCommissionFilters({ skipProject: true });
    const counts = new Map<string, number>();
    for (const c of items) {
      const links = this.vaultItemProjectsService.projectsFor(c.taskId)();
      for (const l of links) {
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

  // Manual items honour the same facets (assigned_to as their "executor").
  private matchesManual(item: VaultItem): boolean {
    const execF  = this.executorFilter();
    const projF  = this.projectFilter();
    const search = this._searchTerm().trim().toLowerCase();

    if (search) {
      const haystack = [item.seq, item.title, item.assigned_to ?? ''].join(' ').toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    if (execF.size > 0) {
      const owner: ActorId | null = item.assigned_to ?? null;
      if (owner == null || !execF.has(owner)) return false;
    }
    if (projF.size > 0) {
      const links = this.vaultItemProjectsService.projectsFor(item.id)();
      if (!links.some(l => projF.has(l.project_id as string))) return false;
    }
    return true;
  }
}
