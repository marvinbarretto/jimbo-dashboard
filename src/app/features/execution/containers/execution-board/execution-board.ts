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
import { SkillsService } from '@features/skills/data-access/skills.service';
import {
  DISPATCH_STATUS_LABELS,
  DISPATCH_EMPTY_LABELS,
  DISPATCH_STATUS_SYSTEM_MANAGED,
  type DispatchStatus,
  type DispatchQueueEntry,
} from '@domain/dispatch';
import type { DispatchId, SkillId, ActorId, ProjectId } from '@domain/ids';
import { VaultCard, type ActionKey } from '@shared/components/vault-card/vault-card';
import type {
  CardContext,
  DispatchCardContext,
  ManualCardContext,
  ProjectRef,
  ParentEpicRef,
  SourceLabel,
  Genesis,
} from '@shared/components/vault-card/card-context';
import { KanbanColumn } from '@shared/components/kanban-column/kanban-column';
import { KanbanFilterBar, type FilterGroup, type FilterOption } from '@shared/components/kanban-filter-bar/kanban-filter-bar';
import { BoardCreateBar } from '@shared/components/board-create-bar/board-create-bar';
import { createKanbanFilterState } from '@shared/kanban/filter-state';
import { withVaultDetailModal, swapDetailSeq } from '@shared/kanban/detail-modal';
import { CommandShortcutsService } from '@shared/services/command-shortcuts.service';
import { isActive, type VaultItem } from '@domain/vault';

const SKILL    = 'skill';
const EXECUTOR = 'executor';
const PROJECT  = 'project';

// 'dispatching' is a sub-second claim state — useful to see on a card but not
// worth a dedicated column. It folds into Running, which is system-managed.
const BOARD_COLUMN_ORDER = ['approved', 'running', 'completed', 'failed'] as const;
type BoardColumn = typeof BOARD_COLUMN_ORDER[number];

const DISPATCH_TO_COLUMN: Record<DispatchStatus, BoardColumn> = {
  approved:    'approved',
  dispatching: 'running',
  running:     'running',
  completed:   'completed',
  failed:      'failed',
};

// Cards in a column are either agent-dispatched entries or operator-owned manual
// items. Both flow through the same columns; manual items sit in Ready (approved)
// until the operator marks them complete.
type ColumnCard =
  | { readonly kind: 'dispatch'; readonly entry: DispatchQueueEntry }
  | { readonly kind: 'manual';   readonly item: VaultItem };

interface ColumnView {
  status:        BoardColumn;
  label:         string;
  emptyLabel:    string;
  cards:         ColumnCard[];
  systemManaged: boolean;
}

@Component({
  selector: 'app-execution-board',
  imports: [VaultCard, KanbanColumn, KanbanFilterBar, BoardCreateBar],
  templateUrl: './execution-board.html',
  styleUrl: './execution-board.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExecutionBoard {
  private readonly dispatchService = inject(DispatchService);
  private readonly vaultItemsService = inject(VaultItemsService);
  private readonly commands = inject(VaultItemCommands);
  private readonly dispatchCommands = inject(DispatchCommands);
  private readonly vaultItemProjectsService = inject(VaultItemProjectsService);
  private readonly projectsService = inject(ProjectsService);
  private readonly actorsService = inject(ActorsService);
  private readonly skillsService = inject(SkillsService);
  private readonly shortcuts = inject(CommandShortcutsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  // Read-only board: the only legal mutation is operator-triggered retry on a
  // failed dispatch. No drag-drop, so no drag-state composable needed.

  // --- filter state -------------------------------------------------------
  private readonly filter = createKanbanFilterState([SKILL, EXECUTOR, PROJECT]);

  private readonly skillFilter    = this.filter.active<string>(SKILL);
  private readonly executorFilter = this.filter.active<string>(EXECUTOR);
  private readonly projectFilter  = this.filter.active<string>(PROJECT);

  // Free-text search — matches against task title, task seq, skill slug, or
  // executor id. Case-insensitive substring.
  private readonly _searchTerm = signal<string>('');
  readonly searchTerm = this._searchTerm.asReadonly();

  // --- mobile state -------------------------------------------------------
  readonly showMobileFilters = signal(false);
  private readonly _mobileColumn = signal<BoardColumn>('approved');
  readonly mobileColumn = this._mobileColumn.asReadonly();
  protected readonly hasActiveFilters = this.filter.hasActive;

  setMobileColumn(status: BoardColumn): void {
    this._mobileColumn.set(status);
  }

  // --- visible entries + columns -----------------------------------------

  readonly visibleEntries = computed(() => this.applyFilters());

  readonly columns = computed<ColumnView[]>(() => {
    const entries = this.visibleEntries();
    const manuals = this.manualItems();
    return BOARD_COLUMN_ORDER.map(colStatus => {
      const dispatchCards: ColumnCard[] = entries
        .filter(e => DISPATCH_TO_COLUMN[e.status] === colStatus)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .map(entry => ({ kind: 'dispatch', entry }));

      // Manual items sit in Ready (approved) until the operator marks them done.
      const manualCards: ColumnCard[] = colStatus === 'approved'
        ? manuals.map(item => ({ kind: 'manual', item }))
        : [];

      return {
        status:        colStatus,
        label:         DISPATCH_STATUS_LABELS[colStatus],
        emptyLabel:    DISPATCH_EMPTY_LABELS[colStatus],
        systemManaged: DISPATCH_STATUS_SYSTEM_MANAGED.includes(colStatus),
        cards: [...manualCards, ...dispatchCards],
      };
    });
  });

  // Surfaces DispatchService.isLoading to the template so each column can
  // render skeleton cards before the first fetch lands.
  protected readonly isLoading = this.dispatchService.isLoading;

  constructor() {
    // Wire ?detail=<seq> ↔ vault-item detail dialog.
    withVaultDetailModal();

    // Pre-load project junctions for every visible task so the project chip on
    // each card resolves synchronously. Vault items + actors + skills auto-load
    // from their services on construction.
    effect(() => {
      for (const entry of this.dispatchService.entries()) {
        this.vaultItemProjectsService.loadFor(entry.task_id);
      }
    });

    // Hydrate from URL on first read; sync back on every change.
    this.route.queryParamMap.pipe(take(1)).subscribe(params => {
      for (const id of (params.get(SKILL)?.split(',').filter(Boolean) ?? [])) {
        this.filter.toggle(SKILL, id);
      }
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
      const skills    = Array.from(this.skillFilter());
      const executors = Array.from(this.executorFilter());
      const projects  = Array.from(this.projectFilter());
      const q = this._searchTerm();

      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {
          [SKILL]:    skills.length    ? skills.join(',')    : null,
          [EXECUTOR]: executors.length ? executors.join(',') : null,
          [PROJECT]:  projects.length  ? projects.join(',')  : null,
          q:          q || null,
        },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    });
  }

  // --- per-card derived data --------------------------------------------

  // Prefer the embed shipped by the API (always present); fall back to the
  // vault-items signal only for legacy fixtures / seed mode.
  taskSeq(entry: DispatchQueueEntry): number | null {
    return entry.task_seq ?? this.vaultItemsService.getById(entry.task_id)?.seq ?? null;
  }

  taskTitle(entry: DispatchQueueEntry): string | null {
    return entry.task_title ?? this.vaultItemsService.getById(entry.task_id)?.title ?? null;
  }

  taskSourceKind(entry: DispatchQueueEntry): string | null {
    return this.vaultItemsService.getById(entry.task_id)?.source?.kind ?? null;
  }

  skillDisplayName(entry: DispatchQueueEntry): string | null {
    return this.skillsService.getById(entry.skill)?.name ?? null;
  }

  primaryProject(entry: DispatchQueueEntry): ProjectRef | null {
    const links = this.vaultItemProjectsService.projectsFor(entry.task_id)();
    if (!links.length) return null;
    const project = this.projectsService.getById(links[0].project_id);
    return project ? { id: project.id as string, display_name: project.display_name, color_token: project.color_token } : null;
  }

  // Resolve project for a manual item — same junction lookup, just keyed by item id.
  private projectForItem(item: VaultItem): ProjectRef | null {
    const links = this.vaultItemProjectsService.projectsFor(item.id)();
    if (!links.length) return null;
    const project = this.projectsService.getById(links[0].project_id);
    return project ? { id: project.id as string, display_name: project.display_name, color_token: project.color_token } : null;
  }

  // Parent epic ref for a vault item — null when no parent or parent isn't loaded.
  private parentEpicFor(taskId: string): ParentEpicRef | null {
    const item = this.vaultItemsService.getById(taskId as never);
    if (!item?.parent_id) return null;
    const parent = this.vaultItemsService.getById(item.parent_id);
    return parent ? { seq: parent.seq, title: parent.title } : null;
  }

  // Single helper that produces the discriminated CardContext for the unified
  // <app-vault-card>. Dispatch entries get owner from entry.executor; manual
  // items resolve owner from item.assigned_to with a fallback to the current
  // actor so the card never has to render an empty owner slot.
  cardContextFor(card: ColumnCard): CardContext {
    if (card.kind === 'dispatch') {
      const item = this.vaultItemsService.getById(card.entry.task_id) ?? null;
      const ctx: DispatchCardContext = {
        kind: 'dispatch',
        entry: card.entry,
        item,
        project: this.primaryProject(card.entry),
        owner: card.entry.executor,
        skillDisplayName: this.skillDisplayName(card.entry),
        parentEpic: this.parentEpicFor(card.entry.task_id as string),
        // TODO: model_id lives on activity_event (per actors README), not on
        // the dispatch row. Needs either a hermes-side denorm onto dispatch at
        // run start, or a per-card activity-event join. Null for now.
        modelId: null,
        genesis: this.genesisFor(item),
      };
      return ctx;
    }
    const item = card.item;
    const ctx: ManualCardContext = {
      kind: 'manual',
      item,
      project: this.projectForItem(item),
      owner: item.assigned_to ?? null,
      parentEpic: item.parent_id ? this.parentEpicFor(item.id as string) : null,
      source: this.sourceLabelFor(item),
      lastActivityAt: item.latest_activity_at ?? item.created_at,
      sourceKind: item.source?.kind ?? null,
      sourceUrl: item.source?.url ?? null,
    };
    return ctx;
  }

  // Map an item's source + parentage into a Genesis chip descriptor. Auto wins
  // over source when there's a parent (the parent decides this child exists),
  // otherwise we read off the source discriminator.
  private genesisFor(item: VaultItem | null): Genesis | null {
    if (!item) return null;
    if (item.parent_id) {
      const parent = this.vaultItemsService.getById(item.parent_id);
      const parentSeq = parent?.seq ?? null;
      return { kind: 'auto', label: parentSeq ? `↳ #${parentSeq}` : '↳ auto', parentSeq };
    }
    const src = item.source;
    if (!src) return null;
    switch (src.kind) {
      case 'manual':     return { kind: 'manual',   label: 'manual',         parentSeq: null };
      case 'agent':      return { kind: 'auto',     label: `auto · @${src.ref}`, parentSeq: null };
      case 'github':     return { kind: 'github',   label: 'github',         parentSeq: null };
      case 'pr-comment': return { kind: 'github',   label: 'pr-comment',     parentSeq: null };
      case 'email':      return { kind: 'external', label: 'email',          parentSeq: null };
      case 'telegram':   return { kind: 'external', label: 'telegram',       parentSeq: null };
      case 'url':        return { kind: 'external', label: 'url',            parentSeq: null };
    }
  }

  private sourceLabelFor(item: VaultItem): SourceLabel | null {
    const src = item.source;
    if (!src) return null;
    if (src.kind === 'agent')      return { text: `by @${src.ref}`, actorId: src.ref };
    if (src.kind === 'manual')     return { text: 'manual', actorId: null };
    if (src.kind === 'pr-comment') return { text: 'via PR comment', actorId: null };
    return { text: `via ${src.kind}`, actorId: null };
  }

  // --- manual track ------------------------------------------------------
  // Operator-managed vault tasks that bypass agent dispatch entirely. Created
  // straight to grooming_status='ready' so they show up here without a stop in
  // the grooming pipeline. "Done" via standard setCompleted; the row drops out
  // when completed_at is set.
  readonly manualItems = computed(() =>
    this.vaultItemsService.items().filter(item =>
      item.type === 'task' &&
      isActive(item) &&
      item.grooming_status === 'ready' &&
      item.source?.kind === 'manual',
    ).sort((a, b) => b.created_at.localeCompare(a.created_at)),
  );

  onCreateManualItem(): void {
    this.shortcuts.openManualCapture();
  }

  onOpenManualItem(item: VaultItem): void {
    swapDetailSeq(this.router, item.seq);
  }

  // --- mutations ---------------------------------------------------------

  onDispatchAction(entry: DispatchQueueEntry, key: ActionKey): void {
    switch (key) {
      case 'retry':   this.dispatchService.retry(entry.id); return;
      case 'dismiss': this.dispatchCommands.dismiss(entry.id); return;
      case 'archive': this.dispatchCommands.archiveTaskAndDismiss(entry); return;
    }
  }

  onManualAction(item: VaultItem, key: ActionKey): void {
    if (key === 'markDone') this.commands.complete(item.id);
  }

  /**
   * Column-level "dismiss all completed". Confirm before sweeping — bulk
   * hard-delete is irreversible (FK costs.dispatch_id cascades to NULL but
   * the dispatch rows themselves are gone).
   */
  onClearCompleted(count: number): void {
    if (count === 0) return;
    if (!window.confirm(`Dismiss all ${count} completed dispatches? This cannot be undone.`)) return;
    this.dispatchCommands.clearCompleted();
  }

  // --- filter groups -----------------------------------------------------

  readonly filterGroups = computed<FilterGroup[]>(() => [
    this.buildSkillGroup(),
    this.buildExecutorGroup(),
    this.buildProjectGroup(),
  ]);

  private buildSkillGroup(): FilterGroup<string> {
    const entries = this.applyFilters({ skipSkill: true });
    const counts = new Map<string, number>();
    for (const e of entries) {
      counts.set(e.skill as string, (counts.get(e.skill as string) ?? 0) + 1);
    }
    const skillIds = new Set(this.dispatchService.entries().map(e => e.skill as string));
    const options: FilterOption<string>[] = Array.from(skillIds).map(id => {
      const skill = this.skillsService.getById(id as SkillId);
      return {
        value: id,
        label: skill?.name ?? id,
        count: counts.get(id) ?? 0,
      };
    }).sort((a, b) => a.label.localeCompare(b.label));
    return { id: SKILL, label: 'Skill', options, active: this.skillFilter() };
  }

  private buildExecutorGroup(): FilterGroup<string> {
    const entries = this.applyFilters({ skipExecutor: true });
    const counts = new Map<string, number>();
    for (const e of entries) {
      if (e.executor == null) continue;
      counts.set(e.executor, (counts.get(e.executor) ?? 0) + 1);
    }
    const executorIds = new Set<string>(
      this.dispatchService.entries()
        .map(e => e.executor)
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
    const entries = this.applyFilters({ skipProject: true });
    const counts = new Map<string, number>();
    for (const e of entries) {
      const links = this.vaultItemProjectsService.projectsFor(e.task_id)();
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

  // --- internal: apply all filters with optional skip --------------------

  private applyFilters(opts: { skipSkill?: boolean; skipExecutor?: boolean; skipProject?: boolean } = {}): DispatchQueueEntry[] {
    const skillF = this.skillFilter();
    const execF  = this.executorFilter();
    const projF  = this.projectFilter();
    const search = this._searchTerm().trim().toLowerCase();

    return this.dispatchService.entries().filter(entry => {
      if (search) {
        const task = this.vaultItemsService.getById(entry.task_id);
        const haystack = [
          task?.seq ?? '',
          task?.title ?? '',
          entry.skill,
          entry.executor,
        ].join(' ').toLowerCase();
        if (!haystack.includes(search)) return false;
      }

      if (!opts.skipSkill && skillF.size > 0) {
        if (!skillF.has(entry.skill as string)) return false;
      }
      if (!opts.skipExecutor && execF.size > 0) {
        if (entry.executor == null || !execF.has(entry.executor)) return false;
      }
      if (!opts.skipProject && projF.size > 0) {
        const links = this.vaultItemProjectsService.projectsFor(entry.task_id)();
        const matches = links.some(l => projF.has(l.project_id as string));
        if (!matches) return false;
      }
      return true;
    });
  }
}
