import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { take } from 'rxjs';
import { VaultItemsService } from '@features/vault-items/data-access/vault-items.service';
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
import type { ActorId } from '@domain/ids';
import type { VaultItemId } from '@domain/ids';
import { GroomingCard, type LiveSnapshot } from '../../components/grooming-card/grooming-card';
import { GroomingNest } from '../../components/grooming-nest/grooming-nest';
import type { VaultActivityEvent } from '@domain/activity/activity-event';
import { KanbanColumn } from '@shared/components/kanban-column/kanban-column';
import { KanbanFilterBar, type FilterGroup, type FilterOption } from '@shared/components/kanban-filter-bar/kanban-filter-bar';
import { BoardCreateBar } from '@shared/components/board-create-bar/board-create-bar';
import { createKanbanDragState } from '@shared/kanban/drag-state';
import { createKanbanFilterState } from '@shared/kanban/filter-state';
import { withVaultDetailModal } from '@shared/kanban/detail-modal';
import { isSeedMode } from '@shared/seed-mode';

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
  status:     GroomingStatus;
  label:      string;
  emptyLabel: string;
  cards:      VaultItem[];
}

@Component({
  selector: 'app-grooming-board',
  imports: [GroomingCard, GroomingNest, KanbanColumn, KanbanFilterBar, BoardCreateBar],
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
  private readonly filter = createKanbanFilterState([PROJECT, OWNER, PRIORITY]);
  protected readonly hasActiveFilters = this.filter.hasActive;

  private readonly projectFilter  = this.filter.active<string>(PROJECT);
  private readonly ownerFilter    = this.filter.active<string>(OWNER);
  private readonly priorityFilter = this.filter.active<number>(PRIORITY);

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
      const q    = this._searchTerm();
      const sort = this._sortMode();

      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {
          [PROJECT]:  projects.length   ? projects.join(',')   : null,
          [OWNER]:    owners.length     ? owners.join(',')     : null,
          [PRIORITY]: priorities.length ? priorities.join(',') : null,
          q:          q || null,
          sort:       sort !== 'priority' ? sort : null,
        },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    });
  }

  // --- per-card derived data passed to <app-grooming-card> ---------------

  // Per-card derived data — first preference is the embed packaged onto the
  // item by the /api/vault-items response (avoids N+1 against parallel
  // services). Falls back to seed-mode service lookups for legacy / offline use.

  primaryProject(item: VaultItem): { id: string; display_name: string } | null {
    if (item.primary_project_id && item.primary_project_name) {
      return { id: item.primary_project_id, display_name: item.primary_project_name };
    }
    // Seed-mode fallback — legacy junction lookup.
    const links = this.vaultItemProjectsService.projectsFor(item.id)();
    if (!links.length) return null;
    const project = this.projectsService.getById(links[0].project_id);
    return project ? { id: project.id as string, display_name: project.display_name } : null;
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

  // Pre-format the latest activity event + latest thread message for the card's
  // expanded view. Reads server-joined embeds when available; falls back to the
  // legacy seed-mode service path otherwise.
  liveSnapshot(item: VaultItem): LiveSnapshot {
    if (item.latest_event !== undefined || item.latest_message !== undefined) {
      const ev = item.latest_event;
      const msg = item.latest_message;
      return {
        latestEvent: ev ? {
          actorLabel:  `@${ev.actor_display_name ?? ev.actor_id}`,
          description: describeProductionAction(ev.action, ev.from_value, ev.to_value),
          at:          ev.ts,
        } : null,
        latestMessage: msg ? {
          authorLabel: `@${msg.author_display_name ?? msg.author_actor_id}`,
          bodyExcerpt: msg.body_excerpt,
          at:          msg.created_at,
        } : null,
      };
    }

    // Seed-mode legacy fallback — uses parallel services.
    const events = this.activityEventsService.eventsFor(item.id)();
    const messages = this.threadService.messagesFor(item.id)();

    const latestEvent = events.length > 0
      ? {
          actorLabel:  this.actorLabel(events[0].actor_id),
          description: this.describeEvent(events[0]),
          at:          events[0].at,
        }
      : null;

    const sortedMessages = [...messages].sort((a, b) => b.created_at.localeCompare(a.created_at));
    const latestMessage = sortedMessages.length > 0
      ? {
          authorLabel: this.actorLabel(sortedMessages[0].author_actor_id),
          bodyExcerpt: this.truncate(sortedMessages[0].body, 100),
          at:          sortedMessages[0].created_at,
        }
      : null;

    return { latestEvent, latestMessage };
  }

  // Single helper — actor label is `@displayName` if loaded, else `@id`.
  private actorLabel(id: string): string {
    const actor = this.actorsService.getById(id as never);
    return `@${actor?.display_name ?? id}`;
  }

  // Map an event variant to a short human-readable description. Mirrors the
  // logic in vault-item-detail.eventDescription — duplicated here on purpose
  // because the card excerpt is a different surface and may diverge.
  private describeEvent(e: VaultActivityEvent): string {
    switch (e.type) {
      case 'created':                 return 'created this item';
      case 'assigned':                {
        const head = e.from_actor_id
          ? `reassigned ${this.actorLabel(e.from_actor_id)} → ${this.actorLabel(e.to_actor_id)}`
          : `assigned to ${this.actorLabel(e.to_actor_id)}`;
        return e.reason ? `${head} — ${e.reason}` : head;
      }
      case 'completion_changed':      return e.to !== null ? 'marked done' : 'un-marked done';
      case 'archived':                return 'archived';
      case 'unarchived':              return 'unarchived';
      case 'grooming_status_changed': return `moved ${e.from.replace('_', ' ')} → ${e.to.replace('_', ' ')}`;
      case 'thread_message_posted':   return `posted ${e.message_kind}`;
      case 'agent_run_completed':     return e.from_status && e.to_status
        ? `ran ${e.skill_id} (${e.from_status.replace('_', ' ')} → ${e.to_status.replace('_', ' ')})`
        : `ran ${e.skill_id}`;
      case 'rejected':                return `rejected ${e.from_status.replace('_', ' ')} → ${this.actorLabel(e.to_owner)}: ${this.truncate(e.reason, 60)}`;
    }
  }

  private truncate(text: string, max: number): string {
    if (text.length <= max) return text;
    return text.slice(0, max - 1).trimEnd() + '…';
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

  readonly assignableActors = computed<readonly ActorId[]>(() =>
    this.actorsService.activeActors()
      .filter(actor => actor.kind === 'human' || actor.kind === 'agent')
      .map(actor => actor.id)
  );

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
      value:      p.id as string,
      label:      p.display_name,
      count:      counts.get(p.id as string) ?? 0,
      entityType: 'project' as const,
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
      value:      a.id as string,
      label:      a.id as string,
      count:      counts.get(a.id as string) ?? 0,
      entityType: 'actor' as const,
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

  onSearchChange(term: string): void { this._searchTerm.set(term); }

  onSortChange(mode: string): void { this._sortMode.set(mode as SortMode); }

  onArchiveItem(item: VaultItem): void {
    this.vaultItemsService.archive(item.id);
  }

  // New tasks land in the Ungroomed column and follow the standard pipeline.
  onCreateTask(title: string): void {
    this.vaultItemsService.createOnBoard({ title, type: 'task', grooming_status: 'ungroomed' });
  }

  onAssignItem(item: VaultItem, actor: ActorId): void {
    if (item.assigned_to === actor) return;
    this.vaultItemsService.reassign(item.id, actor, null);
  }

  resetFilters(): void {
    this.filter.reset();
    this._searchTerm.set('');
  }

  // --- internal: apply all filters with optional skip --------------------
  // Predicates live here because they know about VaultItem shape — the
  // composable owns signal state, the board owns the entity-aware logic.

  private applyFilters(opts: { skipProject?: boolean; skipOwner?: boolean; skipPriority?: boolean } = {}): VaultItem[] {
    const projF  = this.projectFilter();
    const ownerF = this.ownerFilter();
    const priF   = this.priorityFilter();
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
        const links = this.vaultItemProjectsService.projectsFor(item.id)();
        const matches = links.some(l => projF.has(l.project_id as string));
        if (!matches) return false;
      }

      return true;
    });
  }
}

// ── Production action descriptions ───────────────────────────────────────
// Map raw note_activity.action codes (production schema) to short human-readable
// strings for the live snapshot row. Production action vocabulary is wider than
// the dashboard's VaultActivityEvent union — these are best-effort renderings.
function describeProductionAction(action: string, from: string | null, to: string | null): string {
  switch (action) {
    case 'grooming_status_changed':   return `moved ${(from ?? '?').replace(/_/g, ' ')} → ${(to ?? '?').replace(/_/g, ' ')}`;
    case 'reassigned':                return from ? `reassigned @${from} → @${to}` : `assigned to @${to}`;
    case 'submitted_analysis':        return 'submitted analysis';
    case 'submitted_decomposition':   return 'submitted decomposition';
    case 'priority_scored':           return to ? `scored priority P${to}` : 'scored priority';
    case 'priority_changed':          return `priority ${from ?? '?'} → ${to ?? '?'}`;
    case 'question_raised':           return 'raised a question';
    case 'feedback_requeue':          return 'requeued for grooming';
    case 'feedback_reject':           return 'rejected the proposal';
    case 'commission_completed':      return 'commission completed';
    default:                          return action.replace(/_/g, ' ');
  }
}
