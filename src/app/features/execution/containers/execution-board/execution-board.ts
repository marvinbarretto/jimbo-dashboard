import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { take } from 'rxjs';
import { DispatchService } from '@features/execution/data-access/dispatch.service';
import { VaultItemsService } from '@features/vault-items/data-access/vault-items.service';
import { VaultItemProjectsService } from '@features/vault-items/data-access/vault-item-projects.service';
import { ProjectsService } from '@features/projects/data-access/projects.service';
import { ActorsService } from '@features/actors/data-access/actors.service';
import { SkillsService } from '@features/skills/data-access/skills.service';
import {
  DISPATCH_STATUS_ORDER,
  DISPATCH_STATUS_LABELS,
  DISPATCH_EMPTY_LABELS,
  DISPATCH_STATUS_SYSTEM_MANAGED,
  type DispatchStatus,
  type DispatchQueueEntry,
} from '@domain/dispatch';
import type { DispatchId, SkillId, ActorId, ProjectId } from '@domain/ids';
import { ExecutionCard } from '../../components/execution-card/execution-card';
import { KanbanColumn } from '@shared/components/kanban-column/kanban-column';
import { KanbanFilterBar, type FilterGroup, type FilterOption } from '@shared/components/kanban-filter-bar/kanban-filter-bar';
import { createKanbanFilterState } from '@shared/kanban/filter-state';
import { withVaultDetailModal } from '@shared/kanban/detail-modal';

const SKILL    = 'skill';
const EXECUTOR = 'executor';
const PROJECT  = 'project';

interface ColumnView {
  status:        DispatchStatus;
  label:         string;
  emptyLabel:    string;
  cards:         DispatchQueueEntry[];
  systemManaged: boolean;
}

@Component({
  selector: 'app-execution-board',
  imports: [ExecutionCard, KanbanColumn, KanbanFilterBar],
  templateUrl: './execution-board.html',
  styleUrl: './execution-board.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExecutionBoard {
  private readonly dispatchService = inject(DispatchService);
  private readonly vaultItemsService = inject(VaultItemsService);
  private readonly vaultItemProjectsService = inject(VaultItemProjectsService);
  private readonly projectsService = inject(ProjectsService);
  private readonly actorsService = inject(ActorsService);
  private readonly skillsService = inject(SkillsService);
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
  private readonly _mobileColumn = signal<DispatchStatus>('approved');
  readonly mobileColumn = this._mobileColumn.asReadonly();
  protected readonly hasActiveFilters = this.filter.hasActive;

  setMobileColumn(status: DispatchStatus): void {
    this._mobileColumn.set(status);
  }

  // --- visible entries + columns -----------------------------------------

  readonly visibleEntries = computed(() => this.applyFilters());

  readonly columns = computed<ColumnView[]>(() => {
    const entries = this.visibleEntries();
    return DISPATCH_STATUS_ORDER.map(status => ({
      status,
      label:         DISPATCH_STATUS_LABELS[status],
      emptyLabel:    DISPATCH_EMPTY_LABELS[status],
      systemManaged: DISPATCH_STATUS_SYSTEM_MANAGED.includes(status),
      cards: entries
        .filter(e => e.status === status)
        // Within a column: most recent first by created_at.
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    }));
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

  taskSeq(entry: DispatchQueueEntry): number | null {
    return this.vaultItemsService.getById(entry.task_id)?.seq ?? null;
  }

  taskTitle(entry: DispatchQueueEntry): string | null {
    return this.vaultItemsService.getById(entry.task_id)?.title ?? null;
  }

  taskSourceKind(entry: DispatchQueueEntry): string | null {
    return this.vaultItemsService.getById(entry.task_id)?.source?.kind ?? null;
  }

  skillDisplayName(entry: DispatchQueueEntry): string | null {
    return this.skillsService.getById(entry.skill)?.name ?? null;
  }

  primaryProject(entry: DispatchQueueEntry): { id: string; display_name: string } | null {
    const links = this.vaultItemProjectsService.projectsFor(entry.task_id)();
    if (!links.length) return null;
    const project = this.projectsService.getById(links[0].project_id);
    return project ? { id: project.id as string, display_name: project.display_name } : null;
  }

  // --- mutations ---------------------------------------------------------

  onRetry(id: DispatchId): void {
    this.dispatchService.retry(id);
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
      counts.set(e.executor as string, (counts.get(e.executor as string) ?? 0) + 1);
    }
    const executorIds = new Set(this.dispatchService.entries().map(e => e.executor as string));
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
        if (!execF.has(entry.executor as string)) return false;
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
