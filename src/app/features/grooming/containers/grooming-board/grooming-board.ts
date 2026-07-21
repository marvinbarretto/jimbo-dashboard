import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { take } from 'rxjs';
import { VaultItemsService } from '@features/vault-items/data-access/vault-items.service';
import { VaultItemCommands } from '@features/vault-items/commands/vault-item-commands';
import { GroomingCommands } from '@features/grooming/commands/grooming-commands';
import { GroomingHealthStrip } from '../../components/grooming-health-strip/grooming-health-strip';
import { ActorsService } from '@features/actors/data-access/actors.service';
import { ProjectsService } from '@features/projects/data-access/projects.service';
import { VaultItemProjectsService } from '@features/vault-items/data-access/vault-item-projects.service';
import { ActivityEventsService } from '@features/vault-items/data-access/activity-events.service';
import { ThreadService } from '@features/thread/data-access/thread.service';
import type { ThreadMessage } from '@domain/thread';
import {
  GROOMING_STATUS_ORDER,
  GROOMING_STATUS_LABELS,
  GROOMING_EMPTY_LABELS,
  isActive,
  isDone,
  effectivePriority,
  stuckDays,
  compareCardsBy,
  SORT_OPTIONS,
  type GroomingStatus,
  type VaultItem,
  type Priority,
  type SortMode,
} from '@domain/vault';
import { actorId, projectId, type ActorId, type VaultItemId } from '@domain/ids';
import { VaultCard, type ActionKey } from '@shared/components/vault-card/vault-card';
import type { GroomingCardContext, ProjectRef, ChildStatus } from '@shared/components/vault-card/card-context';
import type { ChildState } from '@shared/components/epic-rollup/epic-rollup';

// Map a child item's grooming_status into the coarse rollup bucket. Pre-dispatch
// states collapse to 'grooming'; ready passes through. Per-item dispatch result
// (running / completed / failed) wiring is a follow-up.
function groomingToRollup(item: VaultItem): ChildState {
  if (item.completed_at) return 'completed';
  if (item.grooming_status === 'ready') return 'ready';
  return 'grooming';
}
import { KanbanColumn } from '@shared/components/kanban-column/kanban-column';
import { KanbanFilterBar, type FilterGroup } from '@shared/components/kanban-filter-bar/kanban-filter-bar';
import {
  projectFilterGroup, ownerFilterGroup, priorityFilterGroup, epicFilterGroup,
  epicsForProjects, effectiveEpicSelection, epicKeyOf,
  PROJECT, OWNER, PRIORITY, EPIC, UNASSIGNED, NO_PRIORITY,
} from '@shared/kanban/filter-groups';
import { createKanbanDragState } from '@shared/kanban/drag-state';
import { createKanbanFilterState } from '@shared/kanban/filter-state';
import { withVaultDetailModal, swapDetailSeq } from '@shared/kanban/detail-modal';
import { CommandShortcutsService } from '@shared/services/command-shortcuts.service';
import { isSeedMode } from '@shared/seed-mode';
import { UiButtonLink } from '@shared/components/ui-button-link/ui-button-link';

// Filter dimension ids + sentinels (UNASSIGNED / NO_PRIORITY) come from the shared
// kanban facet module, so the grooming and execution boards stay in lockstep.

interface ColumnView {
  status:     GroomingStatus;
  label:      string;
  emptyLabel: string;
  cards:      VaultItem[];
}

@Component({
  selector: 'app-grooming-board',
  imports: [VaultCard, KanbanColumn, KanbanFilterBar, UiButtonLink, GroomingHealthStrip],
  templateUrl: './grooming-board.html',
  styleUrl: './grooming-board.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Full-bleed layout — the board owns its own edges; opt out of the shell gutter.
  host: { class: 'page-bleed' },
})
export class GroomingBoard {
  private readonly vaultItemsService = inject(VaultItemsService);
  private readonly commands = inject(VaultItemCommands);
  private readonly groomingCommands = inject(GroomingCommands);
  private readonly actorsService = inject(ActorsService);
  protected readonly activeActors = this.actorsService.activeActors;
  private readonly projectsService = inject(ProjectsService);
  private readonly vaultItemProjectsService = inject(VaultItemProjectsService);
  private readonly activityEventsService = inject(ActivityEventsService);
  private readonly threadService = inject(ThreadService);
  private readonly shortcuts = inject(CommandShortcutsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  // Filter panel visibility on mobile — collapsed by default to save screen space.
  readonly showMobileFilters = signal(false);

  // Active column on narrow viewports — defaults to intake_rejected which
  // is where most operator attention lands. Chip strip in the template
  // switches this; desktop ignores it via CSS (all columns always visible).
  private readonly _mobileColumn = signal<GroomingStatus>('intake_rejected');
  readonly mobileColumn = this._mobileColumn.asReadonly();

  setMobileColumn(status: GroomingStatus): void {
    this._mobileColumn.set(status);
  }

  // --- drag state ---------------------------------------------------------
  // Composable: gives us dragging / dropTarget signals + DOM event plumbing +
  // drop-validity logic. Same helper will run the execution kanban.
  protected readonly drag = createKanbanDragState<VaultItemId, GroomingStatus>(
    id => this.vaultItemsService.getById(id)?.grooming_status,
  );

  // --- filter state -------------------------------------------------------
  // Composable: signals + toggle/reset. Per-dimension predicates live below
  // because they know about VaultItem shape; the composable doesn't.
  private readonly filter = createKanbanFilterState([PROJECT, OWNER, PRIORITY, EPIC]);
  protected readonly hasActiveFilters = this.filter.hasActive;

  private readonly projectFilter  = this.filter.active<string>(PROJECT);
  private readonly ownerFilter    = this.filter.active<string>(OWNER);
  private readonly priorityFilter = this.filter.active<number>(PRIORITY);
  private readonly epicFilter     = this.filter.active<string>(EPIC);

  // Free-text search — matches title or seq, case-insensitive substring.
  private readonly _searchTerm = signal<string>('');

  // Sort mode — controls card order within each column. Default is priority.
  private readonly _sortMode = signal<SortMode>('priority');
  readonly sortMode = this._sortMode.asReadonly();
  readonly sortOptions = SORT_OPTIONS;
  readonly searchTerm = this._searchTerm.asReadonly();

  // --- visible items + columns -------------------------------------------

  readonly visibleItems = computed(() => this.applyFilters());

  readonly columns = computed<ColumnView[]>(() => {
    const items = this.visibleItems();
    const comparator = compareCardsBy(this._sortMode());
    return GROOMING_STATUS_ORDER.map(status => ({
      status,
      label:      GROOMING_STATUS_LABELS[status],
      emptyLabel: GROOMING_EMPTY_LABELS[status],
      cards: items
        .filter(i => i.grooming_status === status)
        .sort(comparator),
    }));
  });

  // Surfaces VaultItemsService.isLoading to the template so each column can
  // render skeleton cards. Exposed as a protected getter rather than wiring
  // the service into the template directly so the board owns the dependency.
  protected readonly isLoading = this.vaultItemsService.isLoading;

  constructor() {
    // Wire ?detail=<seq> ↔ vault-item detail dialog.
    withVaultDetailModal();

    // All per-card data (project chip, open-questions badge, pulse intensity,
    // children count, live snapshot, days-in-column) comes from the
    // /api/vault-items embeds. Per-item parallel-service loads only fire in
    // seed mode now — vault-item-detail still calls them on demand.
    effect(() => {
      if (!isSeedMode()) return;
      for (const item of this.vaultItemsService.items()) {
        if (item.type !== 'task' || !isActive(item)) continue;
        this.threadService.loadFor(item.id);
        this.activityEventsService.loadFor(item.id);
      }
    });

    // Hydrate filter state from URL on first read. `take(1)` so we don't fight
    // the write-back effect below — once we've seeded, the effect owns the URL.
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
      const q = params.get('q');
      if (q) this._searchTerm.set(q);
      const sort = params.get('sort');
      if (sort && SORT_OPTIONS.some(o => o.value === sort)) {
        this._sortMode.set(sort as SortMode);
      }
    });

    // Sync filter state back to URL whenever it changes. `replaceUrl: true` so
    // we don't pollute browser history with every chip click; bookmarkable
    // shareability is preserved because the last URL is always the current state.
    effect(() => {
      const projects   = Array.from(this.projectFilter());
      const owners     = Array.from(this.ownerFilter());
      const priorities = Array.from(this.priorityFilter());
      const epics      = Array.from(this.epicFilter());
      const q    = this._searchTerm();
      const sort = this._sortMode();

      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {
          [PROJECT]:  projects.length   ? projects.join(',')   : null,
          [OWNER]:    owners.length     ? owners.join(',')     : null,
          [PRIORITY]: priorities.length ? priorities.join(',') : null,
          [EPIC]:     epics.length      ? epics.join(',')      : null,
          q:          q || null,
          sort:       sort !== 'priority' ? sort : null,
        },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    });
  }

  // --- per-card derived data — composed into CardContext for <app-vault-card> ---

  // Per-card derived data — first preference is the embed packaged onto the
  // item by the /api/vault-items response (avoids N+1 against parallel
  // services). Falls back to seed-mode service lookups for legacy / offline use.

  primaryProject(item: VaultItem): ProjectRef | null {
    // Item embed gives us id + name but no color — look up the project for
    // color_token. Falls back to seed-mode junction when the embed is absent.
    if (item.primary_project_id && item.primary_project_name) {
      const proj = this.projectsService.getById(item.primary_project_id as never);
      return {
        id: item.primary_project_id,
        display_name: item.primary_project_name,
        color_token: proj?.color_token ?? null,
        short_code: proj?.short_code ?? null,
      };
    }
    const links = this.vaultItemProjectsService.projectsFor(item.id)();
    if (!links.length) return null;
    const project = this.projectsService.getById(links[0].project_id);
    return project ? {
      id: project.id as string,
      display_name: project.display_name,
      color_token: project.color_token,
      short_code: project.short_code,
    } : null;
  }

  openQuestionsCount(item: VaultItem): number {
    return item.open_questions_count
        ?? this.threadService.openQuestionsFor(item.id)().length;
  }

  firstOpenQuestion(item: VaultItem): ThreadMessage | null {
    return this.threadService.openQuestionsFor(item.id)()[0] ?? null;
  }

  childrenCount(item: VaultItem): number {
    return item.children_count
        ?? this.vaultItemsService.items().filter(i => i.parent_id === item.id).length;
  }

  parentRef(item: VaultItem): { seq: number; title: string } | null {
    if (!item.parent_id) return null;
    const parent = this.vaultItemsService.getById(item.parent_id);
    return parent ? { seq: parent.seq, title: parent.title } : null;
  }

  // Pre-formatted source attribution for the card. "by @<name>" for agent
  // captures (with actorId for color tinting); "via <channel>" for non-agent
  // captures; "manual" for hand-captures. Returns null when an item has no
  // source — older fixtures predate the column.
  sourceSummary(item: VaultItem): { text: string; actorId: ActorId | null } | null {
    const src = item.source;
    if (!src) return null;
    if (src.kind === 'agent') {
      const actor = this.actorsService.getById(src.ref);
      return { text: `by @${actor?.display_name ?? src.ref}`, actorId: src.ref };
    }
    if (src.kind === 'manual')     return { text: 'manual',          actorId: null };
    if (src.kind === 'pr-comment') return { text: 'via PR comment',  actorId: null };
    return { text: `via ${src.kind}`, actorId: null };
  }

  // MAX(activity_events.at) for an item — the canonical "last touched" signal,
  // drives both the staleness gradient (away from now) and the pulse dot
  // (toward now). Embed if available, else compute from loaded events, else
  // fall back to created_at.
  lastActivityAt(item: VaultItem): string {
    if (item.latest_activity_at) return item.latest_activity_at;
    const events = this.activityEventsService.eventsFor(item.id)();
    return events.length > 0 ? events[0].at : item.created_at;
  }

  // Days since the item entered its current grooming column. Drives the "stuck"
  // hint on the card. Embed if available, else compute from loaded events.
  daysInColumn(item: VaultItem): number {
    return item.days_in_column
        ?? stuckDays(item, this.activityEventsService.eventsFor(item.id)());
  }

  // Per-child status for the rollup strip on epic cards. Maps a child's
  // grooming_status into the rollup's coarser bucket — anything pre-dispatch
  // collapses to 'grooming'; ready/running/completed/failed pass through.
  // Returns null when the item isn't an epic.
  childRollup(item: VaultItem): readonly ChildStatus[] | null {
    if (!item.is_epic) return null;
    const children = this.vaultItemsService.items().filter(i => i.parent_id === item.id);
    return children.map((c): ChildStatus => ({
      seq:   c.seq,
      state: groomingToRollup(c),
    }));
  }

  // Single helper that builds the discriminated CardContext for the unified
  // <app-vault-card>. The board owns all upstream lookups; the card is purely
  // presentational. owner is null when unassigned — never fall back to
  // CURRENT_ACTOR_ID here, that masks real state and breaks ownership styling.
  cardContextFor(item: VaultItem): GroomingCardContext {
    return {
      kind: 'grooming',
      item,
      project: this.primaryProject(item),
      owner: item.assigned_to ?? null,
      openQuestion: this.firstOpenQuestion(item),
      childRollup: this.childRollup(item),
      parentEpic: this.parentRef(item),
      lastActivityAt: this.lastActivityAt(item),
      daysInColumn: this.daysInColumn(item),
      source: this.sourceSummary(item),
      openQuestionsCount: this.openQuestionsCount(item),
      sourceKind: item.source?.kind ?? null,
      sourceUrl: item.source?.url ?? null,
    };
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
    this.groomingCommands.moveColumn(id, status);
  }

  // --- filter groups ------------------------------------------------------
  // Single computed packages all three dimensions for the generic KanbanFilterBar.
  // Each dimension's counts reflect items filtered by all OTHER dimensions, so
  // clicking @kipper doesn't make @kipper's own count drop to zero.

  readonly filterGroups = computed<FilterGroup[]>(() => {
    const groups: FilterGroup[] = [
      projectFilterGroup(
        this.applyFilters({ skipProject: true }),
        this.projectFilter(),
        this.projectsService.activeProjects(),
        item => this.projectLinksFor(item),
      ),
      ownerFilterGroup(
        this.applyFilters({ skipOwner: true }),
        this.ownerFilter(),
        this.actorsService.activeActors().map(a => a.id as string),
      ),
      priorityFilterGroup(
        this.applyFilters({ skipPriority: true }),
        this.priorityFilter(),
      ),
    ];
    // Epic facet is a drill-down of the project selection — it only appears
    // once a project is chosen, and only if that project actually has epics.
    // With nothing selected in it, the skip-epic pass equals visibleItems —
    // reuse the cached computed instead of a redundant full filter pass.
    const epics = this.selectableEpics();
    if (epics.length > 0) {
      const items = this.effectiveEpicFilter().size === 0
        ? this.visibleItems()
        : this.applyFilters({ skipEpic: true });
      groups.push(epicFilterGroup(items, this.epicFilter(), epics));
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

  readonly assignableActors = computed<readonly ActorId[]>(() =>
    this.actorsService.activeActors()
      .filter(actor => actor.kind === 'human' || actor.kind === 'agent')
      .map(actor => actor.id)
  );

  // Inline-typeahead option lists for the card backfill pickers.
  //
  // Project list is global — every card can pick from any active project.
  // Epic list is per-card — scoped to the card's primary project. An epic
  // belongs to ONE project; offering cross-project epics would break the
  // "subtask inherits the parent's project" contract. The card-level
  // template already hides the epic picker until a project is picked, so
  // the empty-array return path here is the safety net, not the UX.
  readonly projectPickerOptions = computed(() =>
    this.projectsService.activeProjects(),
  );

  epicPickerOptionsFor(item: VaultItem): readonly VaultItem[] {
    const proj = this.primaryProject(item);
    if (!proj) return [];
    return this.vaultItemsService.items().filter(epic =>
      epic.is_epic
      && isActive(epic)
      && epic.id !== item.id
      && this.epicProjectId(epic) === proj.id,
    );
  }

  private epicProjectId(epic: VaultItem): string | null {
    if (epic.primary_project_id) return epic.primary_project_id;
    const links = this.vaultItemProjectsService.projectsFor(epic.id)();
    return (links[0]?.project_id as string | undefined) ?? null;
  }

  // Project membership for the facet count + filter. Unions the item's direct
  // junction links with its resolved primary project (the board API has already
  // walked the parent chain), so an inherited subtask matches a project filter
  // and counts toward that facet — the same project the card bar shows.
  private projectLinksFor(item: VaultItem): { project_id: string }[] {
    const ids = new Set(this.vaultItemProjectsService.projectsFor(item.id)().map(l => l.project_id as string));
    if (item.primary_project_id) ids.add(item.primary_project_id as string);
    return [...ids].map(project_id => ({ project_id }));
  }

  onAssignProject(item: VaultItem, id: string): void {
    this.vaultItemProjectsService.add(item.id, projectId(id));
  }

  onAssignEpic(item: VaultItem, epicId: VaultItemId): void {
    if (epicId === item.id) return;  // never self-parent
    this.vaultItemsService.update(item.id, { parent_id: epicId });
  }

  // Single toggle handler — generic filter bar emits (groupId, value); we route
  // to the composable, which knows nothing about the dimensions. The epic
  // facet's dependence on the project selection is handled by derivation
  // (effectiveEpicFilter), not by pruning here.
  onFilterToggle(event: { groupId: string; value: string | number }): void {
    this.filter.toggle(event.groupId, event.value);
  }

  onSearchChange(term: string): void { this._searchTerm.set(term); }

  onSortChange(mode: string): void { this._sortMode.set(mode as SortMode); }

  onPriorityChange(item: VaultItem, priority: Priority | null): void {
    this.vaultItemsService.update(item.id, { manual_priority: priority });
  }

  onAssignItem(item: VaultItem, actor: ActorId): void {
    this.commands.reassign(item.id, actor);
  }

  onCreateTask(): void {
    this.shortcuts.openCapture();
  }

  // Unified action handler — routes each ActionKey to the appropriate service.
  // Reject and decompose open the detail modal; the operator uses the existing
  // UI there (reject reason field, decompose skill trigger) rather than a
  // window.prompt or bare fire-and-forget.
  onCardAction(item: VaultItem, key: ActionKey): void {
    switch (key) {
      case 'demote':
        this.vaultItemsService.update(item.id, { type: 'note', grooming_status: 'ungroomed' });
        return;
      case 'archive':
        this.commands.archive(item.id);
        return;
      case 'delete':
        this.commands.delete(item.id);
        return;
      case 'approve':
        this.commands.approveForDispatch(item.id);
        return;
      case 'answer':
      case 'decompose':
      case 'reject':
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { detail: item.seq },
          queryParamsHandling: 'merge',
        });
        return;
    }
  }

  resetFilters(): void {
    this.filter.reset();
    this._searchTerm.set('');
  }

  // --- internal: apply all filters with optional skip --------------------
  // Predicates live here because they know about VaultItem shape — the
  // composable owns signal state, the board owns the entity-aware logic.

  private applyFilters(opts: { skipProject?: boolean; skipOwner?: boolean; skipPriority?: boolean; skipEpic?: boolean } = {}): VaultItem[] {
    const projF  = this.projectFilter();
    const ownerF = this.ownerFilter();
    const priF   = this.priorityFilter();
    const epicF  = this.effectiveEpicFilter();
    const search = this._searchTerm().trim().toLowerCase();

    return this.vaultItemsService.items().filter(item => {
      if (item.type !== 'task') return false;
      if (!isActive(item)) return false;
      // Epics (items with children) are containers, not dispatchable work.
      // Their subitems appear on the board instead; the epic itself lives in a hierarchy view.
      if (this.vaultItemsService.items().some(i => i.parent_id === item.id)) return false;

      // Search applies across all dimensions — never skipped because it isn't
      // a dimension whose chip-counts could mislead.
      if (search) {
        const haystack = `${item.seq} ${item.title}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }

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
        const links = this.projectLinksFor(item);
        const matches = links.some(l => projF.has(l.project_id as string));
        if (!matches) return false;
      }
      if (!opts.skipEpic && epicF.size > 0) {
        if (!epicF.has(epicKeyOf(item, this.selectableEpicIds()))) return false;
      }

      return true;
    });
  }
}
