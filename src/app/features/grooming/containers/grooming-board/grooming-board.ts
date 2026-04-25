import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { VaultItemsService } from '@features/vault-items/data-access/vault-items.service';
import { ActorsService } from '@features/actors/data-access/actors.service';
import { ProjectsService } from '@features/projects/data-access/projects.service';
import { VaultItemProjectsService } from '@features/vault-items/data-access/vault-item-projects.service';
import { ActivityEventsService } from '@features/vault-items/data-access/activity-events.service';
import { ThreadService } from '@features/thread/data-access/thread.service';
import {
  GROOMING_STATUS_ORDER,
  GROOMING_STATUS_LABELS,
  isActive,
  isDone,
  type GroomingStatus,
  type VaultItem,
  type Priority,
} from '@domain/vault';
import { effectivePriority } from '@domain/vault';
import { compareCardsForKanban } from '@domain/vault';
import type { VaultItemId } from '@domain/ids';
import { GroomingCard } from '../../components/grooming-card/grooming-card';
import { KanbanColumn } from '@shared/components/kanban-column/kanban-column';
import { KanbanFilterBar, type FilterGroup, type FilterOption } from '@shared/components/kanban-filter-bar/kanban-filter-bar';
import { createKanbanDragState } from '@shared/kanban/drag-state';
import { createKanbanFilterState } from '@shared/kanban/filter-state';

// "Unassigned" is its own filter token alongside actor IDs. Using a sentinel string
// keeps the Set<string> simple — branded ActorId values are still strings at runtime.
const UNASSIGNED = '__unassigned__';
// Priority filter sentinel for "no priority set". Distinct from 0 so set membership works.
const NO_PRIORITY = -1;

// Filter dimension ids — declared here so the composable, the chip groups, and
// the toggle handler all reference the same source of truth.
const PROJECT  = 'project';
const OWNER    = 'owner';
const PRIORITY = 'priority';

interface ColumnView {
  status: GroomingStatus;
  label:  string;
  cards:  VaultItem[];
}

@Component({
  selector: 'app-grooming-board',
  imports: [GroomingCard, KanbanColumn, KanbanFilterBar],
  templateUrl: './grooming-board.html',
  styleUrl: './grooming-board.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GroomingBoard {
  private readonly vaultItemsService = inject(VaultItemsService);
  private readonly actorsService = inject(ActorsService);
  private readonly projectsService = inject(ProjectsService);
  private readonly vaultItemProjectsService = inject(VaultItemProjectsService);
  private readonly activityEventsService = inject(ActivityEventsService);
  private readonly threadService = inject(ThreadService);

  // --- drag state ---------------------------------------------------------
  // Composable: gives us dragging / dropTarget signals + DOM event plumbing +
  // drop-validity logic. Same helper will run the execution kanban.
  protected readonly drag = createKanbanDragState<VaultItemId, GroomingStatus>(
    id => this.vaultItemsService.getById(id)?.grooming_status,
  );

  // --- filter state -------------------------------------------------------
  // Composable: signals + toggle/reset. Per-dimension predicates live below
  // because they know about VaultItem shape; the composable doesn't.
  private readonly filter = createKanbanFilterState([PROJECT, OWNER, PRIORITY]);
  protected readonly hasActiveFilters = this.filter.hasActive;

  private readonly projectFilter  = this.filter.active<string>(PROJECT);
  private readonly ownerFilter    = this.filter.active<string>(OWNER);
  private readonly priorityFilter = this.filter.active<number>(PRIORITY);

  // --- visible items + columns -------------------------------------------

  readonly visibleItems = computed(() => this.applyFilters());

  readonly columns = computed<ColumnView[]>(() => {
    const items = this.visibleItems();
    return GROOMING_STATUS_ORDER.map(status => ({
      status,
      label: GROOMING_STATUS_LABELS[status],
      cards: items
        .filter(i => i.grooming_status === status)
        .sort(compareCardsForKanban),
    }));
  });

  constructor() {
    // Pre-load thread + project junctions + activity events for visible cards so
    // badges (open question, project chip, pulse dot) render synchronously.
    // Activity events drive the per-card `lastActivityAt` → pulse intensity.
    effect(() => {
      for (const item of this.vaultItemsService.items()) {
        if (item.type !== 'task' || !isActive(item)) continue;
        this.threadService.loadFor(item.id);
        this.vaultItemProjectsService.loadFor(item.id);
        this.activityEventsService.loadFor(item.id);
      }
    });
  }

  // --- per-card derived data passed to <app-grooming-card> ---------------

  primaryProject(item: VaultItem): { id: string; display_name: string } | null {
    const links = this.vaultItemProjectsService.projectsFor(item.id)();
    if (!links.length) return null;
    const project = this.projectsService.getById(links[0].project_id);
    return project ? { id: project.id as string, display_name: project.display_name } : null;
  }

  openQuestionsCount(item: VaultItem): number {
    return this.threadService.openQuestionsFor(item.id)().length;
  }

  childrenCount(item: VaultItem): number {
    return this.vaultItemsService.items().filter(i => i.parent_id === item.id).length;
  }

  parentSeq(item: VaultItem): number | null {
    if (!item.parent_id) return null;
    const parent = this.vaultItemsService.getById(item.parent_id);
    return parent ? parent.seq : null;
  }

  // MAX(activity_events.at) for an item — the canonical "last touched" signal,
  // drives both the staleness gradient (away from now) and the pulse dot
  // (toward now). Falls back to created_at if no events have loaded yet.
  lastActivityAt(item: VaultItem): string {
    const events = this.activityEventsService.eventsFor(item.id)();
    // events are sorted desc — head is the latest
    return events.length > 0 ? events[0].at : item.created_at;
  }

  // Rolled-up priority for epic cards: the most-urgent (lowest integer) priority
  // among unfinished children. Returns null if the item isn't an epic OR no
  // unfinished child has a priority set. Per Agile orthodoxy: an epic's urgency
  // is derived from its children, not declared on the container itself.
  rolledUpPriorityForEpic(item: VaultItem): Priority | null {
    const children = this.vaultItemsService.items().filter(i => i.parent_id === item.id && !isDone(i));
    if (children.length === 0) return null;
    let min: Priority | null = null;
    for (const child of children) {
      const p = effectivePriority(child);
      if (p === null) continue;
      if (min === null || p < min) min = p;
    }
    return min;
  }

  // --- drag & drop --------------------------------------------------------
  // Thin wrappers that delegate to the composable and call the service write.

  onDragStart(event: DragEvent, item: VaultItem): void {
    this.drag.onDragStart(event, item.id);
  }
  onDragEnd(): void { this.drag.onDragEnd(); }
  onColumnDragOver(event: DragEvent, status: GroomingStatus): void {
    this.drag.onDragOver(event, status);
  }
  onColumnDragLeave(status: GroomingStatus): void { this.drag.onDragLeave(status); }

  onColumnDrop(event: DragEvent, status: GroomingStatus): void {
    const id = this.drag.onDrop(event, status);
    if (!id) return;
    // Single write path — emits grooming_status_changed event for audit.
    this.vaultItemsService.setGroomingStatus(id, status, null);
  }

  // --- filter groups ------------------------------------------------------
  // Single computed packages all three dimensions for the generic KanbanFilterBar.
  // Each dimension's counts reflect items filtered by all OTHER dimensions, so
  // clicking @ralph doesn't make @ralph's own count drop to zero.

  readonly filterGroups = computed<FilterGroup[]>(() => [
    this.buildProjectGroup(),
    this.buildOwnerGroup(),
    this.buildPriorityGroup(),
  ]);

  private buildProjectGroup(): FilterGroup<string> {
    const items = this.applyFilters({ skipProject: true });
    const counts = new Map<string, number>();
    for (const item of items) {
      const links = this.vaultItemProjectsService.projectsFor(item.id)();
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

  private buildOwnerGroup(): FilterGroup<string> {
    const items = this.applyFilters({ skipOwner: true });
    const counts = new Map<string, number>();
    let unassigned = 0;
    for (const item of items) {
      if (item.assigned_to) {
        counts.set(item.assigned_to as string, (counts.get(item.assigned_to as string) ?? 0) + 1);
      } else {
        unassigned++;
      }
    }
    const options: FilterOption<string>[] = this.actorsService.activeActors().map(a => ({
      value: a.id as string,
      label: `@${a.id}`,
      count: counts.get(a.id as string) ?? 0,
      tone:  a.id as string,
    }));
    options.push({ value: UNASSIGNED, label: 'unassigned', count: unassigned });
    return { id: OWNER, label: 'Owner', options, active: this.ownerFilter() };
  }

  private buildPriorityGroup(): FilterGroup<number> {
    const items = this.applyFilters({ skipPriority: true });
    const counts = new Map<number, number>();
    for (const item of items) {
      const eff = effectivePriority(item);
      const key = eff === null ? NO_PRIORITY : eff;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const options: FilterOption<number>[] = [
      { value: 0,  label: 'P0', count: counts.get(0)  ?? 0, tone: 'P0' },
      { value: 1,  label: 'P1', count: counts.get(1)  ?? 0, tone: 'P1' },
      { value: 2,  label: 'P2', count: counts.get(2)  ?? 0, tone: 'P2' },
      { value: 3,  label: 'P3', count: counts.get(3)  ?? 0, tone: 'P3' },
      { value: NO_PRIORITY, label: 'no priority', count: counts.get(NO_PRIORITY) ?? 0 },
    ];
    return { id: PRIORITY, label: 'Priority', options, active: this.priorityFilter() };
  }

  // Single toggle handler — generic filter bar emits (groupId, value); we route
  // to the composable, which knows nothing about the dimensions.
  onFilterToggle(event: { groupId: string; value: string | number }): void {
    this.filter.toggle(event.groupId, event.value);
  }

  resetFilters(): void { this.filter.reset(); }

  // --- internal: apply all filters with optional skip --------------------
  // Predicates live here because they know about VaultItem shape — the
  // composable owns signal state, the board owns the entity-aware logic.

  private applyFilters(opts: { skipProject?: boolean; skipOwner?: boolean; skipPriority?: boolean } = {}): VaultItem[] {
    const projF  = this.projectFilter();
    const ownerF = this.ownerFilter();
    const priF   = this.priorityFilter();

    return this.vaultItemsService.items().filter(item => {
      if (item.type !== 'task') return false;
      if (!isActive(item)) return false;
      // Epics (items with children) are containers, not dispatchable work.
      // Their subitems appear on the board instead; the epic itself lives in a hierarchy view.
      if (this.vaultItemsService.items().some(i => i.parent_id === item.id)) return false;

      if (!opts.skipOwner && ownerF.size > 0) {
        const ownerKey = item.assigned_to ?? UNASSIGNED;
        if (!ownerF.has(ownerKey as string)) return false;
      }
      if (!opts.skipPriority && priF.size > 0) {
        const eff = effectivePriority(item);
        const key = eff === null ? NO_PRIORITY : eff;
        if (!priF.has(key)) return false;
      }
      if (!opts.skipProject && projF.size > 0) {
        const links = this.vaultItemProjectsService.projectsFor(item.id)();
        const matches = links.some(l => projF.has(l.project_id as string));
        if (!matches) return false;
      }

      return true;
    });
  }
}
