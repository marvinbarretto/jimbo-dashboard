import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { DispatchService } from '@features/execution/data-access/dispatch.service';
import { VaultItemsService } from '@features/vault-items/data-access/vault-items.service';
import { VaultItemProjectsService } from '@features/vault-items/data-access/vault-item-projects.service';
import { ProjectsService } from '@features/projects/data-access/projects.service';
import { ActorsService } from '@features/actors/data-access/actors.service';
import { SkillsService } from '@features/skills/data-access/skills.service';
import {
  DISPATCH_STATUS_ORDER,
  DISPATCH_STATUS_LABELS,
  DISPATCH_STATUS_SYSTEM_MANAGED,
  type DispatchStatus,
  type DispatchQueueEntry,
} from '@domain/dispatch';
import type { DispatchId, SkillId, ActorId, ProjectId } from '@domain/ids';
import { ExecutionCard } from '../../components/execution-card/execution-card';
import { KanbanColumn } from '@shared/components/kanban-column/kanban-column';
import { KanbanFilterBar, type FilterGroup, type FilterOption } from '@shared/components/kanban-filter-bar/kanban-filter-bar';
import { createKanbanFilterState } from '@shared/kanban/filter-state';

const SKILL    = 'skill';
const EXECUTOR = 'executor';
const PROJECT  = 'project';

interface ColumnView {
  status: DispatchStatus;
  label:  string;
  cards:  DispatchQueueEntry[];
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

  // Read-only board: the only legal mutation is operator-triggered retry on a
  // failed dispatch. No drag-drop, so no drag-state composable needed.

  // --- filter state -------------------------------------------------------
  private readonly filter = createKanbanFilterState([SKILL, EXECUTOR, PROJECT]);

  private readonly skillFilter    = this.filter.active<string>(SKILL);
  private readonly executorFilter = this.filter.active<string>(EXECUTOR);
  private readonly projectFilter  = this.filter.active<string>(PROJECT);

  // --- visible entries + columns -----------------------------------------

  readonly visibleEntries = computed(() => this.applyFilters());

  readonly columns = computed<ColumnView[]>(() => {
    const entries = this.visibleEntries();
    return DISPATCH_STATUS_ORDER.map(status => ({
      status,
      label: DISPATCH_STATUS_LABELS[status],
      systemManaged: DISPATCH_STATUS_SYSTEM_MANAGED.includes(status),
      cards: entries
        .filter(e => e.status === status)
        // Within a column: most recent first by created_at.
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    }));
  });

  constructor() {
    // Pre-load project junctions for every visible task so the project chip on
    // each card resolves synchronously. Vault items + actors + skills auto-load
    // from their services on construction.
    effect(() => {
      for (const entry of this.dispatchService.entries()) {
        this.vaultItemProjectsService.loadFor(entry.task_id);
      }
    });
  }

  // --- per-card derived data --------------------------------------------

  taskSeq(entry: DispatchQueueEntry): number | null {
    return this.vaultItemsService.getById(entry.task_id)?.seq ?? null;
  }

  taskTitle(entry: DispatchQueueEntry): string | null {
    return this.vaultItemsService.getById(entry.task_id)?.title ?? null;
  }

  skillDisplayName(entry: DispatchQueueEntry): string | null {
    return this.skillsService.getById(entry.skill)?.display_name ?? null;
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
        label: skill?.display_name ?? id,
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
      value: id,
      label: `@${id}`,
      count: counts.get(id) ?? 0,
      tone:  id,
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
      value: p.id as string,
      label: p.display_name,
      count: counts.get(p.id as string) ?? 0,
      tone:  p.id as string,
    }));
    return { id: PROJECT, label: 'Project', options, active: this.projectFilter() };
  }

  onFilterToggle(event: { groupId: string; value: string | number }): void {
    this.filter.toggle(event.groupId, event.value);
  }

  resetFilters(): void { this.filter.reset(); }

  // --- internal: apply all filters with optional skip --------------------

  private applyFilters(opts: { skipSkill?: boolean; skipExecutor?: boolean; skipProject?: boolean } = {}): DispatchQueueEntry[] {
    const skillF = this.skillFilter();
    const execF  = this.executorFilter();
    const projF  = this.projectFilter();

    return this.dispatchService.entries().filter(entry => {
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
