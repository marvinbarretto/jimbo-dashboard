import { ChangeDetectionStrategy, Component, TemplateRef, computed, effect, inject, viewChild } from '@angular/core';
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
import { UiPageHeader } from '@shared/components/ui-page-header/ui-page-header';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiCluster } from '@shared/components/ui-cluster/ui-cluster';
import { UiDataTable } from '@shared/components/ui-data-table/ui-data-table';
import { RelativeTimePipe } from '@shared/pipes/relative-time.pipe';
import { MarkdownPipe } from '@shared/pipes/markdown.pipe';
import { ProjectsService } from '../../data-access/projects.service';
import { ProjectActivityEventsService } from '../../data-access/project-activity-events.service';
import { ActorsService } from '../../../actors/data-access/actors.service';
import { VaultItemsService } from '../../../vault-items/data-access/vault-items.service';
import { VaultItemProjectsService } from '../../../vault-items/data-access/vault-item-projects.service';
import { FocusSessionsService } from '../../../pomo/data-access/focus-sessions.service';
import { ProjectStatTile } from '../../components/project-stat-tile/project-stat-tile';
import { ProjectFocusSessionRow } from '../../components/project-focus-session-row/project-focus-session-row';
import { ProjectBriefField } from '../../components/project-brief-field/project-brief-field';
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
    UiPageHeader,
    UiSection,
    UiStack,
    RelativeTimePipe,
    MarkdownPipe,
    ProjectStatTile,
    VaultChip,
    ProjectFocusSessionRow,
    ProjectBriefField,
    ActorChip,
    UiDataTable,
    PriorityBadge,
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

  readonly itemColumns: ColumnDef<VaultItem, any>[] = [
    this.columnHelper.accessor(row => row.seq, {
      id: 'seq',
      header: 'Item',
      cell: () => this.chipCell(),
      sortingFn: 'basic',
    }),
    this.columnHelper.accessor(row => row.type, {
      id: 'type',
      header: 'Type',
      sortingFn: 'alphanumeric',
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
    }),
    this.columnHelper.accessor(row => row.created_at, {
      id: 'created',
      header: 'Created',
      cell: () => this.relativeCell(),
      sortingFn: 'alphanumeric',
    }),
    this.columnHelper.accessor(row => row.latest_activity_at ?? row.created_at, {
      id: 'touched',
      header: 'Last touched',
      cell: () => this.relativeCell(),
      sortingFn: 'alphanumeric',
    }),
  ];


  constructor() {
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

  // Autonomy level governs how much Boris/Ralph may do without a human in the
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
