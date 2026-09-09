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
import { ProjectFocusSessionRow } from '../../components/project-focus-session-row/project-focus-session-row';
import { ProjectBriefField } from '../../components/project-brief-field/project-brief-field';
import { ProjectConstraintsSection } from '../../components/project-constraints-section/project-constraints-section';
import { ProjectOperatingContextSection } from '../../components/project-operating-context-section/project-operating-context-section';
import { ProjectDeliverySection } from '../../components/project-delivery-section/project-delivery-section';
import { ProjectIdentitySection, type ProjectScale } from '../../components/project-identity-section/project-identity-section';
import { ProjectRightNowSection, type DispatchTask } from '../../components/project-right-now-section/project-right-now-section';
import { ProjectAutonomySection } from '../../components/project-autonomy-section/project-autonomy-section';
import { VaultChip } from '@shared/components/vault-chip/vault-chip';
import { briefActorProjectTrigger, briefVaultItemTrigger } from '../../util/brief-mention-triggers';
import type { Priority, VaultItem } from '@domain/vault/vault-item';
import { isActive, isDone } from '@domain/vault/vault-item';
import { effectivePriority } from '@domain/vault/readiness';
import { PriorityBadge } from '@shared/components/priority-badge/priority-badge';
import type { ProjectActivityEvent } from '@domain/activity/activity-event';
import type { ActorId } from '@domain/ids';
import type { ProjectAutonomyLevel, UpdateProjectPayload } from '@domain/projects';
import { hasCodebase } from '@domain/projects';

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

// How far back the focus-session read goes. Declared as a constant because
// the number is rendered next to the totals it bounds — an undeclared
// denominator turns "0 sessions" into something that reads as idleness rather
// than as a window that happened to be empty.
const FOCUS_WINDOW_DAYS = 30;

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

// Project landing page — the home for a project.
//
// Ranked, not tiled. The page used to be ~16 peer sections in two columns:
// purpose, personas and success criteria sat at the BOTTOM of the right-hand
// column, below Facts, while six vault counters (Items / Active / Done /
// Epics / Focus / Sessions) led the page without answering what was happening
// on it. It reads top-down now, in six zones:
//
//   1 Identity   — what this project is (was: bottom of the aside)
//   2 Right now  — what needs a person today (was: six vault stat tiles)
//   3 Delivery   — may agents act, and what has shipped
//   4 Work       — epics, issues, loose items, repos
//   5 Memory     — what already happened here (collapsed)
//   6 Reference  — lookups (collapsed)
//
// Nothing was removed. The counters that led the page now read as a sentence
// under Identity, and every section that existed is still here, ranked.
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
    VaultChip,
    ProjectFocusSessionRow,
    ProjectBriefField,
    ProjectConstraintsSection,
    ProjectOperatingContextSection,
    ProjectDeliverySection,
    ProjectIdentitySection,
    ProjectRightNowSection,
    ProjectAutonomySection,
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

  // httpResource — signal-based; re-fetches whenever the route id changes.
  // experimental API (Angular 19.2+) — no stability concern at Angular 21.
  readonly understandingResource = httpResource<ProjectUnderstanding>(() => {
    const id = this.id();
    if (!id) return undefined;
    return `/api/projects/${id}/understanding`;
  });

  readonly understanding = this.understandingResource.value;

  /**
   * Structured beliefs exist to render. `current_state` stores the same
   * markdown raw, so the identity block folds the raw field away when this is
   * true rather than showing a store and its rendering side by side.
   */
  readonly hasStructuredBeliefs = computed(() => (this.understanding()?.sections?.length ?? 0) > 0);

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

  // One read covers both halves of "is an agent mid-flight here" and "is one
  // waiting on me" — the queue endpoint takes a status set, so asking twice
  // would only create a window where the two disagree.
  readonly dispatchResource = httpResource<{ items: DispatchTask[]; total: number }>(() => {
    const id = this.id();
    if (!id) return undefined;
    return `/api/dispatch/queue?status=proposed,approved,running&project_id=${id}&limit=20`;
  });

  private readonly dispatchItems = computed(() => this.dispatchResource.value()?.items ?? []);

  readonly proposedTasks = computed(() => this.dispatchItems().filter(t => t.status === 'proposed'));
  readonly inFlightTasks = computed(() =>
    this.dispatchItems().filter(t => t.status === 'approved' || t.status === 'running'));

  /**
   * The queue read has not answered — loading, or it failed. Passed down so
   * "Right now" can say "unmeasured" instead of 0: a zero from a request that
   * never returned reads as an all-clear, which is the one thing it never is.
   */
  readonly dispatchUnmeasured = computed(() =>
    this.dispatchResource.isLoading() || this.dispatchResource.error() != null);

  // Belief proposals the steward raised against this project's understanding,
  // sitting unanswered. They expire, so an unanswered one is a decision lost
  // rather than a decision deferred.
  readonly proposalsResource = httpResource<{ id: string }[]>(() => {
    const id = this.id();
    if (!id) return undefined;
    return `/api/understanding-proposals?status=pending&project_id=${id}`;
  });

  readonly pendingProposals = computed(() => this.proposalsResource.value()?.length ?? 0);

  readonly proposalsUnmeasured = computed(() =>
    this.proposalsResource.isLoading() || this.proposalsResource.error() != null);

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

  /**
   * "115 of 161" made absence look like a defect. Count what is there; only
   * show the fraction when a filter is actually narrowing the list.
   */
  readonly githubSectionTitle = computed<string>(() => {
    const total = this.githubIssues().length;
    const shown = this.visibleGithubIssues().length;
    return shown === total ? `GitHub issues (${total})` : `GitHub issues (${shown} of ${total})`;
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
      .filter(i => isActive(i) && (this.isFlagged(i) || this.isOverdue(i, now)))
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

  isOverdue(item: VaultItem, now = Date.now()): boolean {
    return item.due_at !== null && new Date(item.due_at).getTime() < now;
  }

  /**
   * Every session for this project inside the loaded window — NOT a page of
   * them. The old version sliced to 8 here and then summed the slice, so the
   * "Focus" and "Sessions" tiles silently capped at 8 while labelled "last 30
   * days". The window is declared alongside the number now (see `scale`).
   */
  readonly sessionsForProject = computed(() => {
    const p = this.project();
    if (!p) return [];
    return this.sessions.recent()
      .filter(s => s.project_id === p.id)
      .sort((a, b) => b.started_at.localeCompare(a.started_at));
  });

  /** The slice actually rendered as rows; the counts above are the full set. */
  readonly recentSessions = computed(() => this.sessionsForProject().slice(0, 8));

  readonly events = computed(() => {
    const p = this.project();
    return p ? this.activity.eventsFor(p.id)() : [];
  });

  readonly recentEvents = computed(() => this.events().slice(0, 10));

  // Total focus minutes across FOCUS_WINDOW_DAYS — "is this project actually
  // getting time?" without opening the pomo reports page.
  readonly focusMinutes = computed(() => {
    const total = this.sessionsForProject().reduce((acc, s) => {
      return acc + (s.actual_seconds ?? s.planned_seconds);
    }, 0);
    return Math.round(total / 60);
  });

  /**
   * Where the six stat tiles went.
   *
   * Items / Active / Done / Epics / Focus / Sessions were the page's headline
   * numbers and answered none of the questions a project page is opened to
   * answer. They still say something worth knowing — how big this thing is —
   * so they read as a sentence beneath the identity block instead.
   */
  readonly scale = computed<ProjectScale>(() => ({
    items:  this.items().length,
    active: this.activeItems().length,
    done:   this.doneItems().length,
    epics:  this.epicItems().length,
    focusMinutes: this.focusMinutes(),
    sessions: this.sessionsForProject().length,
    focusWindowDays: FOCUS_WINDOW_DAYS,
  }));

  /**
   * Whether the Work zone applies at all. A travel-planning or life-admin
   * project with no linked items and no codebase has no epics, no issues, no
   * loose items and no repos — four empty shells say less than one sentence
   * admitting there is nothing tracked here yet.
   */
  readonly hasWork = computed(() => {
    const p = this.project();
    return this.items().length > 0 || (!!p && hasCodebase(p));
  });

  // ── Section expand state ──────────────────────────────────────────
  // UiSection is controlled: it renders `expanded` and emits `toggled`, and
  // does nothing on its own. Every collapsible section on this page was bound
  // to neither, so "collapsible" ones could not actually be collapsed and
  // Understanding — the one passing [expanded]="false" — could never be
  // opened at all. One map, one toggle, so the ranking below the fold is a
  // default rather than a wall.
  private readonly _open = signal<Readonly<Record<string, boolean>>>({
    epics: true, github: true, unassigned: true, repos: true,
    understanding: false, activity: false, focus: false, done: false,
    resources: false, facts: false, criteria: false,
  });

  isOpen(key: string): boolean {
    return this._open()[key] ?? false;
  }

  toggleSection(key: string): void {
    this._open.update(m => ({ ...m, [key]: !(m[key] ?? false) }));
  }

  /** Focus totals with their window attached — see FOCUS_WINDOW_DAYS. */
  readonly focusMeta = computed<string>(() => {
    const n = this.sessionsForProject().length;
    if (n === 0) return `none in the last ${FOCUS_WINDOW_DAYS} days`;
    return `${this.focusMinutes()}m across ${n} session${n === 1 ? '' : 's'} in the last ${FOCUS_WINDOW_DAYS} days`;
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
    // No default filter. This used to open pre-filtered to "not yet in Jimbo"
    // on the theory that unlinked issues were "the actionable subset" — but the
    // `jimbo` label is a promotion gate, not a mirror, so *not* being in Jimbo
    // is the normal resting state of an issue, not a backlog. Leading with it
    // rendered 115 rows of PROMOTE buttons and read as 115 unprocessed things.
    // The filter is still one click away for when you actually want it.

    // Open vault items in a CDK Dialog when a row is clicked; URL ?detail=
    // becomes the source of truth so back-button closes the modal.
    withVaultDetailModal();

    // Recent focus sessions aren't loaded by default; this view needs them.
    this.sessions.loadRecent(FOCUS_WINDOW_DAYS);

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

  patchAutonomy(id: string, next: ProjectAutonomyLevel | null): void {
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
      case 'note_recurred':       return 'same alert fired again';
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
