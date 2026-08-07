import { ChangeDetectionStrategy, Component, TemplateRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { type CellContext, type ColumnDef, createColumnHelper } from '@tanstack/angular-table';
import { HttpClient, httpResource } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { formatPageTitle } from '@app/app-title-strategy';
import { UiBreadcrumb } from '@shared/components/ui-breadcrumb/ui-breadcrumb';
import type { Crumb } from '@shared/components/ui-breadcrumb/ui-breadcrumb';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { UiButtonLink } from '@shared/components/ui-button-link/ui-button-link';
import { ActorChip } from '@shared/components/actor-chip/actor-chip';
import { UiInlineEdit } from '@shared/components/ui-inline-edit/ui-inline-edit';
import { withVaultDetailModal } from '@shared/kanban/detail-modal';
import { UiCard } from '@shared/components/ui-card/ui-card';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiPage } from '@shared/components/ui-page/ui-page';
import { UiPageHeader } from '@shared/components/ui-page-header/ui-page-header';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiCluster } from '@shared/components/ui-cluster/ui-cluster';
import { UiDataTable } from '@shared/components/ui-data-table/ui-data-table';
import { UiButton } from '@shared/components/ui-button/ui-button';
import { ToastService } from '@shared/components/toast/toast.service';
import { KanbanFilterBar, type FilterGroup } from '@shared/components/kanban-filter-bar/kanban-filter-bar';
import { createKanbanFilterState } from '@shared/kanban/filter-state';
import { RelativeTimePipe } from '@shared/pipes/relative-time.pipe';
import { MarkdownPipe } from '@shared/pipes/markdown.pipe';
import { UiDropdown } from '@shared/components/ui-dropdown/ui-dropdown';
import { rankEpicCandidates, type EpicCandidate } from '@domain/vault/epic-candidates';
import { ProjectsService } from '../../data-access/projects.service';
import { ProjectActivityEventsService } from '../../data-access/project-activity-events.service';
import { ActorsService } from '../../../actors/data-access/actors.service';
import { VaultItemsService } from '../../../vault-items/data-access/vault-items.service';
import { VaultItemProjectsService } from '../../../vault-items/data-access/vault-item-projects.service';
import { FocusSessionsService } from '../../../pomo/data-access/focus-sessions.service';
import { ProjectStatTile } from '../../components/project-stat-tile/project-stat-tile';
import { ProjectFocusSessionRow } from '../../components/project-focus-session-row/project-focus-session-row';
import { ProjectBriefField } from '../../components/project-brief-field/project-brief-field';
import { ProjectBriefBulletField } from '../../components/project-brief-bullet-field/project-brief-bullet-field';
import { ProjectConstraintsSection } from '../../components/project-constraints-section/project-constraints-section';
import { ProjectOperatingContextSection } from '../../components/project-operating-context-section/project-operating-context-section';
import { VaultChip } from '@shared/components/vault-chip/vault-chip';
import { briefActorProjectTrigger, briefVaultItemTrigger } from '../../util/brief-mention-triggers';
import type { Priority, VaultItem } from '@domain/vault/vault-item';
import { isActive, isDone } from '@domain/vault/vault-item';
import { effectivePriority } from '@domain/vault/readiness';
import { PriorityBadge } from '@shared/components/priority-badge/priority-badge';
import type { ProjectActivityEvent } from '@domain/activity/activity-event';
import type { ActorId } from '@domain/ids';
import type { ProjectAutonomyLevel, UpdateProjectPayload } from '@domain/projects';

// Epic + its child items, split into outstanding (active) and done. The
// landing page renders one block per epic so contributors can see at a glance
// what's open under each major body of work.
interface EpicGroup {
  readonly epic: VaultItem;
  readonly outstanding: readonly VaultItem[];
  readonly done: readonly VaultItem[];
}

interface BeliefTag { key: string; value: string }
interface Belief { id: string; text: string; tags: BeliefTag[] }
interface BeliefSection { name: string; letter: string; beliefs: Belief[] }
interface ProjectUnderstanding {
  short_code: string | null;
  working_doc_url: string | null;
  sections: BeliefSection[];
  last_updated: string | null;
}

interface DispatchTask {
  id: number;
  task_id: string;
  task_title: string | null;
  task_seq: number | null;
  status: string;
  executor: string | null;
  skill: string | null;
  flow: string;
  started_at: string | null;
  approved_at: string | null;
  result_summary: string | null;
}

// Filter dimension ids for the GitHub issues panel — page-scoped, not shared
// with the vault-item filter-groups (@shared/kanban/filter-groups), since
// GithubIssueRow isn't a VaultItem.
const GH_STATUS = 'gh_status';
const GH_LABEL = 'gh_label';
const GH_LINKED = 'linked';
const GH_UNLINKED = 'unlinked';

interface GithubIssueRow {
  number: number;
  title: string;
  html_url: string;
  state: string;
  labels: string[];
  created_at: string;
  updated_at: string;
  linked: { note_id: string; seq: number | null; status: string; grooming_status: string | null } | null;
}

interface ProjectActivityItem {
  id: number;
  note_id: string;
  note_title: string | null;
  note_seq: number | null;
  ts: string;
  actor: string;
  action: string;
  from_value: string | null;
  to_value: string | null;
  reason: string | null;
}

// Project landing page — the home for a project. Two-column layout on
// desktop: epics/items dominate the left, brief + facts pinned on the right.
@Component({
  selector: 'app-project-landing',
  imports: [
    RouterLink,
    UiBreadcrumb,
    UiBadge,
    UiButtonLink,
    UiInlineEdit,
    UiCard,
    UiCluster,
    UiEmptyState,
    UiPage,
    UiPageHeader,
    UiSection,
    UiStack,
    RelativeTimePipe,
    MarkdownPipe,
    ProjectStatTile,
    VaultChip,
    ProjectFocusSessionRow,
    ProjectBriefField,
    ProjectBriefBulletField,
    ProjectConstraintsSection,
    ProjectOperatingContextSection,
    ActorChip,
    UiDataTable,
    UiDropdown,
    PriorityBadge,
    UiButton,
    KanbanFilterBar,
  ],
  templateUrl: './project-landing.html',
  styleUrl: './project-landing.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    // Expose the project color to every descendant as `--project-accent`.
    // Falls back to the global accent token so the page still reads when
    // a project has no color_token.
    '[style.--project-accent]': 'project()?.color_token ?? null',
  },
})
export class ProjectLanding {
  private readonly projects = inject(ProjectsService);
  private readonly actors = inject(ActorsService);
  private readonly activity = inject(ProjectActivityEventsService);
  private readonly vault = inject(VaultItemsService);
  private readonly junctions = inject(VaultItemProjectsService);
  private readonly sessions = inject(FocusSessionsService);
  private readonly route = inject(ActivatedRoute);
  private readonly titleService = inject(Title);
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);

  private readonly id = toSignal(this.route.paramMap.pipe(map(p => p.get('id') ?? '')));

  readonly project = computed(() => this.projects.getById(this.id() ?? ''));

  // Repo-owned when a manifest sync has stamped synced_at. The operating fields
  // the sync writes (intent, entry_points, conventions_url, footguns,
  // out_of_scope, autonomy) then render read-only — the repo is the source of
  // truth. Manifest-less projects keep full inline-edit.
  readonly isRepoSynced = computed(() => !!this.project()?.synced_at);

  // httpResource — signal-based; re-fetches whenever the route id changes.
  // experimental API (Angular 19.2+) — no stability concern at Angular 21.
  readonly understandingResource = httpResource<ProjectUnderstanding>(() => {
    const id = this.id();
    if (!id) return undefined;
    return `/api/projects/${id}/understanding`;
  });

  readonly understanding = this.understandingResource.value;

  // Beliefs flagged {open:true} OR containing unconfirmed/open keywords.
  // These surface as a callout at the top of the Understanding section.
  readonly openBeliefs = computed<Belief[]>(() => {
    const u = this.understanding();
    if (!u) return [];
    const OPEN_KEYWORDS = /\b(unconfirmed|not yet confirmed|not confirmed|under consideration|tbd|tbc|to be confirmed|not yet decided)\b/i;
    return u.sections.flatMap(s => s.beliefs).filter(b => {
      if (b.tags.some(t => t.key === 'open' && t.value === 'true')) return true;
      if (b.tags.some(t => t.key === 'corrected')) return false;
      return OPEN_KEYWORDS.test(b.text);
    });
  });

  readonly dispatchResource = httpResource<{ items: DispatchTask[]; total: number }>(() => {
    const id = this.id();
    if (!id) return undefined;
    return `/api/dispatch/queue?status=running,approved&project_id=${id}&limit=10`;
  });

  readonly inFlightTasks = computed(() => this.dispatchResource.value()?.items ?? []);

  // Open GitHub issues for this project's repo, annotated with vault sync
  // status — surfaces the backlog GitHub already owns without reinventing it,
  // and lets an unlinked issue be promoted into the jimbo pipeline in one click.
  readonly githubIssuesResource = httpResource<{ repo: string; issues: GithubIssueRow[] }>(() => {
    const id = this.id();
    const p = this.project();
    if (!id || !p?.repo_url) return undefined;
    return `/api/github-issues?project_id=${id}`;
  });

  readonly githubIssues = computed(() => this.githubIssuesResource.value()?.issues ?? []);

  // Issue numbers currently being promoted — local-only so the button
  // disables instantly; the linked vault item itself arrives via webhook a
  // moment later, not synchronously with this request.
  private readonly _promotingIssues = signal<ReadonlySet<number>>(new Set());

  isPromoting(issueNumber: number): boolean {
    return this._promotingIssues().has(issueNumber);
  }

  promoteIssue(issueNumber: number): void {
    const p = this.project();
    if (!p) return;
    this._promotingIssues.update(s => new Set(s).add(issueNumber));
    this.http.post('/api/github-issues/promote', { project_id: p.id, issue_number: issueNumber }).subscribe({
      next: () => this.toast.success(`Applied jimbo label to #${issueNumber} — Jimbo will pick it up shortly`),
      error: () => {
        this.toast.error(`Failed to promote #${issueNumber}`);
        this._promotingIssues.update(s => {
          const next = new Set(s);
          next.delete(issueNumber);
          return next;
        });
      },
    });
  }

  // Filters for the GitHub issues panel — same shared bar/state composable the
  // kanban boards use (@shared/components/kanban-filter-bar,
  // @shared/kanban/filter-state), with facets built for GithubIssueRow instead
  // of VaultItem. Defaults to "not yet in Jimbo" so a big backlog (e.g. 148
  // open issues) doesn't drown the actionable subset on first load.
  private readonly githubFilter = createKanbanFilterState([GH_STATUS, GH_LABEL]);
  private readonly ghStatusFilter = this.githubFilter.active<string>(GH_STATUS);
  private readonly ghLabelFilter  = this.githubFilter.active<string>(GH_LABEL);
  private readonly _ghSearchTerm = signal('');
  readonly ghSearchTerm = this._ghSearchTerm.asReadonly();

  readonly githubFilterGroups = computed<FilterGroup[]>(() => {
    const issues = this.githubIssues();
    let linkedCount = 0;
    const labelCounts = new Map<string, number>();
    for (const issue of issues) {
      if (issue.linked) linkedCount++;
      for (const label of issue.labels) labelCounts.set(label, (labelCounts.get(label) ?? 0) + 1);
    }
    return [
      {
        id: GH_STATUS,
        label: 'Status',
        active: this.ghStatusFilter(),
        options: [
          { value: GH_UNLINKED, label: 'Not in Jimbo', count: issues.length - linkedCount },
          { value: GH_LINKED,   label: 'In Jimbo',     count: linkedCount },
        ],
      },
      {
        id: GH_LABEL,
        label: 'Label',
        active: this.ghLabelFilter(),
        options: Array.from(labelCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([value, count]) => ({ value, label: value, count })),
      },
    ];
  });

  readonly visibleGithubIssues = computed(() => {
    const statusF = this.ghStatusFilter();
    const labelF  = this.ghLabelFilter();
    const search  = this._ghSearchTerm().trim().toLowerCase();
    return this.githubIssues().filter(issue => {
      if (statusF.size > 0) {
        const key = issue.linked ? GH_LINKED : GH_UNLINKED;
        if (!statusF.has(key)) return false;
      }
      if (labelF.size > 0 && !issue.labels.some(l => labelF.has(l))) return false;
      if (search && !`${issue.number} ${issue.title}`.toLowerCase().includes(search)) return false;
      return true;
    });
  });

  onGithubFilterToggle(event: { groupId: string; value: string | number }): void {
    this.githubFilter.toggle(event.groupId, event.value);
  }

  onGithubSearchChange(term: string): void {
    this._ghSearchTerm.set(term);
  }

  readonly projectActivityResource = httpResource<{ items: ProjectActivityItem[] }>(() => {
    const id = this.id();
    if (!id) return undefined;
    return `/api/projects/${id}/activity?limit=20`;
  });

  readonly projectActivity = computed(() => this.projectActivityResource.value()?.items ?? []);

  readonly crumbs = computed<readonly Crumb[]>(() => {
    const p = this.project();
    return [
      { label: 'Projects', link: ['/config/projects'] },
      { label: p?.display_name ?? '…' },
    ];
  });

  readonly owner = computed(() => {
    const p = this.project();
    if (!p?.owner_actor_id) return undefined;
    return this.actors.getById(p.owner_actor_id);
  });

  // Items linked to this project, derived from the in-memory vault rows.
  // Uses the embedded primary_project_id (board API) plus the junction
  // service so non-primary links still surface.
  readonly items = computed<VaultItem[]>(() => {
    const p = this.project();
    if (!p) return [];
    const all = this.vault.items();
    return all.filter(i => this.itemBelongsToProject(i, p.id));
  });

  readonly activeItems = computed(() => this.items().filter(isActive));
  readonly doneItems = computed(() => this.items().filter(isDone));
  readonly epicItems = computed(() => this.items().filter(i => i.is_epic));

  // Epics grouped with their child items. Outstanding (active) vs done split
  // so the most useful slice (what's still open) reads first.
  readonly epicGroups = computed<readonly EpicGroup[]>(() => {
    const items = this.items();
    const epics = items.filter(i => i.is_epic);
    return epics.map(epic => {
      const children = items.filter(i => i.parent_id === epic.id);
      return {
        epic,
        outstanding: children.filter(isActive),
        done: children.filter(isDone),
      };
    });
  });

  readonly projectEpics = computed(() => this.items().filter(i => i.is_epic && isActive(i)));


  /**
   * Ranked adoption candidates per loose item, precomputed as a Map.
   *
   * Deliberately NOT a `candidatesFor(item)` method called from the template:
   * that re-ranks every row on every change-detection pass. One computed, one
   * Map lookup per cell.
   */
  readonly adoptionCandidates = computed<ReadonlyMap<string, readonly EpicCandidate[]>>(() => {
    const epics = this.projectEpics();
    const out = new Map<string, readonly EpicCandidate[]>();
    if (epics.length === 0) return out;
    for (const item of this.unassignedActive()) {
      out.set(item.id, rankEpicCandidates(item, epics));
    }
    return out;
  });

  /** Epics with no scoring signal for this item — still offered, just below the
   *  ranked ones, because "no shared tag" is not the same as "wrong parent". */
  readonly otherEpicsFor = computed<ReadonlyMap<string, readonly VaultItem[]>>(() => {
    const epics = this.projectEpics();
    const out = new Map<string, readonly VaultItem[]>();
    for (const [itemId, ranked] of this.adoptionCandidates()) {
      const rankedIds = new Set(ranked.map(c => c.epic.id));
      out.set(itemId, epics.filter(e => !rankedIds.has(e.id)));
    }
    return out;
  });

  /**
   * Files a loose item under an epic. The item list is a signal off
   * VaultItemsService, so the row leaves the unassigned table on its own.
   */
  fileUnder(item: VaultItem, epic: VaultItem): void {
    this.vault.update(item.id, { parent_id: epic.id });
    this.toast.success(`#${item.seq} filed under #${epic.seq} ${epic.title}`);
  }

  // Items that aren't under an epic this project owns. Either parent_id is
  // null, or it points to an epic outside this project (cross-project edge).
  readonly unassignedActive = computed<readonly VaultItem[]>(() => {
    const items = this.items();
    const epicIds = new Set(items.filter(i => i.is_epic).map(i => i.id));
    return items.filter(i =>
      !i.is_epic
      && isActive(i)
      && (i.parent_id === null || !epicIds.has(i.parent_id)),
    );
  });

  // Things that need a human decision now: overdue tasks, and `assertion`-type
  // items — a system-generated "these facts don't add up" note (e.g. a
  // booking task still open with days to the deadline and no calendar
  // block). Both are read from `items()`, so only items already linked to
  // this project surface here — an item tagged/mentioned but never linked
  // via vault_item_projects won't show up until that linkage exists.
  // VaultItemType doesn't list 'assertion' yet (the dashboard's type union
  // predates it), hence the cast.
  readonly attentionItems = computed<readonly VaultItem[]>(() => {
    const now = Date.now();
    return this.items()
      .filter(i => isActive(i) && (this.isFlagged(i) || (i.due_at !== null && new Date(i.due_at).getTime() < now)))
      .sort((a, b) => {
        // Overdue-longest first; undated (flagged) items sort after dated
        // ones, newest-created first among themselves.
        if (a.due_at && b.due_at) return a.due_at.localeCompare(b.due_at);
        if (a.due_at) return -1;
        if (b.due_at) return 1;
        return b.created_at.localeCompare(a.created_at);
      });
  });

  isFlagged(item: VaultItem): boolean {
    return (item.type as string) === 'assertion';
  }

  isOverdue(item: VaultItem): boolean {
    return item.due_at !== null && new Date(item.due_at).getTime() < Date.now();
  }

  readonly sessionsForProject = computed(() => {
    const p = this.project();
    if (!p) return [];
    return this.sessions.recent()
      .filter(s => s.project_id === p.id)
      .sort((a, b) => b.started_at.localeCompare(a.started_at))
      .slice(0, 8);
  });

  readonly events = computed(() => {
    const p = this.project();
    return p ? this.activity.eventsFor(p.id)() : [];
  });

  readonly recentEvents = computed(() => this.events().slice(0, 10));

  // Total focus minutes across the visible recent window. Used as a stat tile
  // — surfaces "is this project actually getting time?" without needing the
  // pomo reports page.
  readonly focusMinutes = computed(() => {
    const total = this.sessionsForProject().reduce((acc, s) => {
      return acc + (s.actual_seconds ?? s.planned_seconds);
    }, 0);
    return Math.round(total / 60);
  });

  // Mention triggers shared by every brief textarea. Plain-text inline
  // references; see brief-mention-triggers.ts for the contract.
  readonly briefTriggers = [
    briefActorProjectTrigger(this.projects.activeProjects, this.actors.activeActors),
    briefVaultItemTrigger(this.http),
  ];

  // ── Unassigned-items table ────────────────────────────────────────
  // Each accessor returns the *sortable* value; the visual lives in a
  // <ng-template> referenced by `cell`. `latest_activity_at` falls back to
  // created_at so seed rows still sort sensibly.
  private readonly columnHelper = createColumnHelper<VaultItem>();
  private readonly chipCell =
    viewChild.required<TemplateRef<{ $implicit: CellContext<VaultItem, number> }>>('chipCell');
  private readonly priorityCell =
    viewChild.required<TemplateRef<{ $implicit: CellContext<VaultItem, Priority | null> }>>('priorityCell');
  private readonly relativeCell =
    viewChild.required<TemplateRef<{ $implicit: CellContext<VaultItem, string> }>>('relativeCell');
  private readonly adoptCell =
    viewChild.required<TemplateRef<{ $implicit: CellContext<VaultItem, string> }>>('adoptCell');

  // TanStack defaults every column to a fixed 150px unless `size` is set —
  // fine for "Type"/"Priority"/dates, but it starved the one column holding a
  // free-text title, truncating it far earlier than the row had room for.
  readonly itemColumns: ColumnDef<VaultItem, any>[] = [
    this.columnHelper.accessor(row => row.seq, {
      id: 'seq',
      header: 'Item',
      cell: () => this.chipCell(),
      sortingFn: 'basic',
      size: 480,
      minSize: 240,
    }),
    this.columnHelper.accessor(row => row.type, {
      id: 'type',
      header: 'Type',
      sortingFn: 'alphanumeric',
      size: 80,
    }),
    this.columnHelper.accessor(row => effectivePriority(row), {
      id: 'priority',
      header: 'Priority',
      cell: () => this.priorityCell(),
      // Null-priority rows sort to the bottom; P0 is highest urgency so
      // ascending order surfaces the most urgent first.
      sortingFn: (a, b) => {
        const pa = effectivePriority(a.original);
        const pb = effectivePriority(b.original);
        if (pa === null && pb === null) return 0;
        if (pa === null) return 1;
        if (pb === null) return -1;
        return pa - pb;
      },
      size: 90,
    }),
    this.columnHelper.accessor(row => row.created_at, {
      id: 'created',
      header: 'Created',
      cell: () => this.relativeCell(),
      sortingFn: 'alphanumeric',
      size: 110,
    }),
    this.columnHelper.accessor(row => row.latest_activity_at ?? row.created_at, {
      id: 'touched',
      header: 'Last touched',
      cell: () => this.relativeCell(),
      sortingFn: 'alphanumeric',
      size: 110,
    }),
  ];

  // Unassigned rows get one extra column the epic-grouped tables must not have:
  // those items already have a parent, so offering to re-file them here would
  // be a different (and riskier) action than adopting a loose one.
  readonly unassignedColumns: ColumnDef<VaultItem, any>[] = [
    ...this.itemColumns,
    this.columnHelper.accessor(row => row.id, {
      id: 'adopt',
      header: 'File under',
      cell: () => this.adoptCell(),
      enableSorting: false,
      size: 210,
    }),
  ];


  constructor() {
    // Default the GitHub issues panel to "not yet in Jimbo" — the actionable
    // subset — so a large backlog doesn't bury it under already-linked rows.
    this.githubFilter.toggle(GH_STATUS, GH_UNLINKED);

    // Open vault items in a CDK Dialog when a row is clicked; URL ?detail=
    // becomes the source of truth so back-button closes the modal.
    withVaultDetailModal();

    // Recent focus sessions aren't loaded by default; this view needs them.
    this.sessions.loadRecent(30);

    effect(() => {
      const p = this.project();
      if (p) this.activity.loadFor(p.id);
    });

    effect(() => {
      const p = this.project();
      if (p) this.titleService.setTitle(formatPageTitle(p.display_name));
    });
  }

  actorDisplay(actorIdStr: ActorId | null): string {
    if (!actorIdStr) return '—';
    const actor = this.actors.getById(actorIdStr);
    return actor ? `@${actor.id}` : `@${actorIdStr}`;
  }

  eventDescription(event: ProjectActivityEvent): string {
    switch (event.type) {
      case 'project_created':            return 'created this project';
      case 'project_criteria_changed':   return 'updated criteria';
      case 'project_owner_changed': {
        const from = this.actorDisplay(event.from_actor_id);
        const to   = this.actorDisplay(event.to_actor_id);
        return `transferred ownership ${from} → ${to}`;
      }
      case 'project_archived':           return 'archived this project';
      case 'project_unarchived':         return 'unarchived this project';
    }
  }

  // Autonomy level governs how much Boris/Kipper may do without a human in the
  // loop on tasks under this project. Null = inherit global default.
  readonly autonomyOptions: readonly { value: ProjectAutonomyLevel | ''; label: string; hint: string }[] = [
    { value: '',        label: 'Default (inherit)', hint: 'No project-specific policy — use the global dispatch default.' },
    { value: 'none',    label: 'None — read-only',  hint: 'Agents may inspect but must not write.' },
    { value: 'propose', label: 'Propose',           hint: 'Agents prepare changes; a human approves.' },
    { value: 'ship',    label: 'Ship',              hint: 'Agents may land changes directly.' },
  ];

  patchAutonomy(id: string, value: string): void {
    const next = value === '' ? null : (value as ProjectAutonomyLevel);
    this.projects.update(id, { autonomy_level: next });
  }

  patch(id: string, changes: UpdateProjectPayload): void {
    this.projects.update(id, changes);
  }

  patchName(id: string, value: string): void {
    const trimmed = value.trim();
    if (trimmed) this.projects.update(id, { display_name: trimmed });
  }

  statusTone(status: string): 'success' | 'neutral' {
    return status === 'active' ? 'success' : 'neutral';
  }

  beliefTag(belief: Belief, key: string): string | null {
    return belief.tags.find(t => t.key === key)?.value ?? null;
  }

  activityDesc(item: ProjectActivityItem): string {
    switch (item.action) {
      case 'note_created':        return `${item.to_value ?? 'note'} created`;
      case 'status_changed':      return `status → ${item.to_value ?? '?'}`;
      case 'dispatch_started':    return 'dispatch started';
      case 'commission_completed': return `commission completed${item.reason ? ` · ${item.reason}` : ''}`;
      case 'recon_completed':     return `recon completed${item.reason ? ` · ${item.reason}` : ''}`;
      case 'submitted_analysis':  return `analysis submitted → ${item.to_value ?? '?'}`;
      case 'submitted_decomposition': return 'decomposition submitted';
      case 'question_raised':     return `question raised${item.to_value ? ` for @${item.to_value}` : ''}`;
      case 'question_answered':   return 'question answered';
      case 'reassigned':          return `reassigned → ${item.to_value ?? '?'}`;
      case 'priority_changed':    return `priority ${item.from_value} → ${item.to_value}`;
      case 'grooming_status_changed': return `grooming → ${item.to_value}`;
      case 'assigned':            return `assigned to ${item.to_value ?? '?'}`;
      case 'unassigned':          return 'unassigned';
      case 'feedback_accept':     return 'feedback accepted';
      case 'feedback_reject':     return 'feedback rejected';
      case 'feedback_archive':    return 'archived via feedback';
      default:                    return item.action;
    }
  }

  // Lightweight derived helpers — used by template stat tiles for individual
  // epic groups so the math doesn't sprawl into the template.
  childrenDoneCount(group: EpicGroup): number {
    return group.done.length;
  }

  childrenTotalCount(group: EpicGroup): number {
    return group.outstanding.length + group.done.length;
  }

  private itemBelongsToProject(item: VaultItem, projectId: string): boolean {
    if (item.primary_project_id === projectId) return true;
    const junctions = this.junctions.projectsFor(item.id)();
    return junctions.some(j => j.project_id === projectId);
  }
}
