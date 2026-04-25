import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { VaultItemsService } from '../../../vault-items/data-access/vault-items.service';
import { ActorsService } from '../../../actors/data-access/actors.service';
import { ProjectsService } from '../../../projects/data-access/projects.service';
import { VaultItemProjectsService } from '../../../vault-items/data-access/vault-item-projects.service';
import { ThreadService } from '../../../thread/data-access/thread.service';
import {
  GROOMING_STATUS_ORDER,
  GROOMING_STATUS_LABELS,
  isActive,
  type GroomingStatus,
} from '../../../../domain/vault/vault-item';
import { effectivePriority } from '../../../../domain/vault/readiness';
import type { VaultItem } from '../../../../domain/vault/vault-item';
import type { VaultItemId } from '../../../../domain/ids';
import { GroomingCard } from '../../components/grooming-card/grooming-card';
import { GroomingColumn } from '../../components/grooming-column/grooming-column';
import { GroomingFilterBar, type FilterOption } from '../../components/grooming-filter-bar/grooming-filter-bar';

// "Unassigned" is its own filter token alongside actor IDs. Using a sentinel string
// keeps the Set<string> simple — branded ActorId values are still strings at runtime.
const UNASSIGNED = '__unassigned__';
// Priority filter sentinel for "no priority set". Distinct from 0 so set membership works.
const NO_PRIORITY = -1;

interface ColumnView {
  status: GroomingStatus;
  label:  string;
  cards:  VaultItem[];
}

@Component({
  selector: 'app-grooming-board',
  imports: [GroomingCard, GroomingColumn, GroomingFilterBar],
  templateUrl: './grooming-board.html',
  styleUrl: './grooming-board.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GroomingBoard {
  private readonly vaultItemsService = inject(VaultItemsService);
  private readonly actorsService = inject(ActorsService);
  private readonly projectsService = inject(ProjectsService);
  private readonly vaultItemProjectsService = inject(VaultItemProjectsService);
  private readonly threadService = inject(ThreadService);

  // --- drag state ---------------------------------------------------------

  private readonly _dragging = signal<VaultItemId | null>(null);
  private readonly _dropTarget = signal<GroomingStatus | null>(null);
  readonly dragging   = this._dragging.asReadonly();
  readonly dropTarget = this._dropTarget.asReadonly();

  // --- filter state -------------------------------------------------------
  // Empty Set = no filter applied for that dimension.
  private readonly _projectFilter  = signal<Set<string>>(new Set());
  private readonly _ownerFilter    = signal<Set<string>>(new Set());
  private readonly _priorityFilter = signal<Set<number>>(new Set());
  readonly projectFilter  = this._projectFilter.asReadonly();
  readonly ownerFilter    = this._ownerFilter.asReadonly();
  readonly priorityFilter = this._priorityFilter.asReadonly();

  // --- visible items + columns -------------------------------------------

  readonly visibleItems = computed(() => this.applyFilters());

  readonly columns = computed<ColumnView[]>(() => {
    const items = this.visibleItems();
    return GROOMING_STATUS_ORDER.map(status => ({
      status,
      label: GROOMING_STATUS_LABELS[status],
      cards: items
        .filter(i => i.grooming_status === status)
        .sort(this.cardComparator),
    }));
  });

  // Card sort: effective_priority asc (urgent first), then created_at desc (newest
  // first within the same priority). Items with no priority sort to the bottom.
  private readonly cardComparator = (a: VaultItem, b: VaultItem): number => {
    const pa = effectivePriority(a);
    const pb = effectivePriority(b);
    if (pa !== pb) {
      if (pa === null) return 1;
      if (pb === null) return -1;
      return pa - pb;
    }
    return b.created_at.localeCompare(a.created_at);
  };

  constructor() {
    // Pre-load thread + project junctions for visible cards so badges render synchronously.
    effect(() => {
      for (const item of this.vaultItemsService.items()) {
        if (item.type !== 'task' || !isActive(item)) continue;
        this.threadService.loadFor(item.id);
        this.vaultItemProjectsService.loadFor(item.id);
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

  // --- drag & drop --------------------------------------------------------

  onDragStart(event: DragEvent, item: VaultItem): void {
    this._dragging.set(item.id);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/x-vault-item-id', item.id);
    }
  }

  onDragEnd(): void {
    this._dragging.set(null);
    this._dropTarget.set(null);
  }

  onColumnDragOver(event: DragEvent, status: GroomingStatus): void {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    this._dropTarget.set(status);
  }

  onColumnDragLeave(status: GroomingStatus): void {
    if (this._dropTarget() === status) this._dropTarget.set(null);
  }

  onColumnDrop(event: DragEvent, status: GroomingStatus): void {
    event.preventDefault();
    const draggedId = this._dragging();
    this._dragging.set(null);
    this._dropTarget.set(null);
    if (!draggedId) return;
    const item = this.vaultItemsService.getById(draggedId);
    if (!item || item.grooming_status === status) return;
    // Single write path — emits grooming_status_changed event for audit.
    this.vaultItemsService.setGroomingStatus(draggedId, status, null);
  }

  isEligibleDropTarget(status: GroomingStatus): boolean {
    const draggedId = this._dragging();
    if (!draggedId) return false;
    const item = this.vaultItemsService.getById(draggedId);
    return !!item && item.grooming_status !== status;
  }

  // --- filter chip option lists ------------------------------------------
  // Each dimension's counts reflect items filtered by all OTHER dimensions, so
  // clicking @ralph doesn't make @ralph's own count drop to zero.

  readonly projectOptions = computed<FilterOption<string>[]>(() => {
    const items = this.applyFilters({ skipProject: true });
    const counts = new Map<string, number>();
    for (const item of items) {
      const links = this.vaultItemProjectsService.projectsFor(item.id)();
      for (const l of links) {
        counts.set(l.project_id as string, (counts.get(l.project_id as string) ?? 0) + 1);
      }
    }
    return this.projectsService.activeProjects().map(p => ({
      value: p.id as string,
      label: p.display_name,
      count: counts.get(p.id as string) ?? 0,
      tone:  p.id as string,
    }));
  });

  readonly ownerOptions = computed<FilterOption<string>[]>(() => {
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
    const opts: FilterOption<string>[] = this.actorsService.activeActors().map(a => ({
      value: a.id as string,
      label: `@${a.id}`,
      count: counts.get(a.id as string) ?? 0,
      tone:  a.id as string,
    }));
    opts.push({ value: UNASSIGNED, label: 'unassigned', count: unassigned });
    return opts;
  });

  readonly priorityOptions = computed<FilterOption<number>[]>(() => {
    const items = this.applyFilters({ skipPriority: true });
    const counts = new Map<number, number>();
    for (const item of items) {
      const eff = effectivePriority(item);
      const key = eff === null ? NO_PRIORITY : eff;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [
      { value: 0,  label: 'P0', count: counts.get(0)  ?? 0, tone: 'P0' },
      { value: 1,  label: 'P1', count: counts.get(1)  ?? 0, tone: 'P1' },
      { value: 2,  label: 'P2', count: counts.get(2)  ?? 0, tone: 'P2' },
      { value: 3,  label: 'P3', count: counts.get(3)  ?? 0, tone: 'P3' },
      { value: NO_PRIORITY, label: 'no priority', count: counts.get(NO_PRIORITY) ?? 0 },
    ];
  });

  // --- toggle handlers ---------------------------------------------------

  toggleProject(id: string):  void { this.toggleSetMember(this._projectFilter,  id); }
  toggleOwner(id: string):    void { this.toggleSetMember(this._ownerFilter,    id); }
  togglePriority(v: number):  void { this.toggleSetMember(this._priorityFilter, v);  }

  private toggleSetMember<T>(sig: ReturnType<typeof signal<Set<T>>>, value: T): void {
    sig.update(set => {
      const next = new Set(set);
      next.has(value) ? next.delete(value) : next.add(value);
      return next;
    });
  }

  resetFilters(): void {
    this._projectFilter.set(new Set());
    this._ownerFilter.set(new Set());
    this._priorityFilter.set(new Set());
  }

  // --- internal: apply all filters with optional skip --------------------

  private applyFilters(opts: { skipProject?: boolean; skipOwner?: boolean; skipPriority?: boolean } = {}): VaultItem[] {
    const projF  = this._projectFilter();
    const ownerF = this._ownerFilter();
    const priF   = this._priorityFilter();

    return this.vaultItemsService.items().filter(item => {
      if (item.type !== 'task') return false;
      if (!isActive(item)) return false;

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
