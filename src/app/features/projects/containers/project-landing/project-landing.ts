import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { formatPageTitle } from '@app/app-title-strategy';
import { UiBackLink } from '@shared/components/ui-back-link/ui-back-link';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { UiCard } from '@shared/components/ui-card/ui-card';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiPageHeader } from '@shared/components/ui-page-header/ui-page-header';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiCluster } from '@shared/components/ui-cluster/ui-cluster';
import { RelativeTimePipe } from '@shared/pipes/relative-time.pipe';
import { ProjectsService } from '../../data-access/projects.service';
import { ProjectActivityEventsService } from '../../data-access/project-activity-events.service';
import { ActorsService } from '../../../actors/data-access/actors.service';
import { VaultItemsService } from '../../../vault-items/data-access/vault-items.service';
import { VaultItemProjectsService } from '../../../vault-items/data-access/vault-item-projects.service';
import { FocusSessionsService } from '../../../pomo/data-access/focus-sessions.service';
import { ProjectStatTile } from '../../components/project-stat-tile/project-stat-tile';
import { ProjectVaultItemRow } from '../../components/project-vault-item-row/project-vault-item-row';
import { ProjectFocusSessionRow } from '../../components/project-focus-session-row/project-focus-session-row';
import type { VaultItem } from '@domain/vault/vault-item';
import { isActive, isDone } from '@domain/vault/vault-item';
import type { ProjectActivityEvent } from '@domain/activity/activity-event';
import type { ActorId } from '@domain/ids';

// Project landing page — the home for a project. Pulls activity from existing
// services (vault items, focus sessions, project events). The container is
// the only place that knows how to wire those signals together; the row /
// tile components stay dumb.
@Component({
  selector: 'app-project-landing',
  imports: [
    RouterLink,
    UiBackLink,
    UiBadge,
    UiCard,
    UiCluster,
    UiEmptyState,
    UiPageHeader,
    UiSection,
    UiStack,
    RelativeTimePipe,
    ProjectStatTile,
    ProjectVaultItemRow,
    ProjectFocusSessionRow,
  ],
  templateUrl: './project-landing.html',
  styleUrl: './project-landing.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
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

  private readonly id = toSignal(this.route.paramMap.pipe(map(p => p.get('id') ?? '')));

  readonly project = computed(() => this.projects.getById(this.id() ?? ''));

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

  // Most recently touched first. `latest_activity_at` is populated by the
  // board API; fall back to created_at so seed-mode rows still sort sensibly.
  readonly recentItems = computed(() => {
    return [...this.items()]
      .sort((a, b) => this.itemTimestamp(b).localeCompare(this.itemTimestamp(a)))
      .slice(0, 8);
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

  constructor() {
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

  statusTone(status: string): 'success' | 'neutral' {
    return status === 'active' ? 'success' : 'neutral';
  }

  private itemBelongsToProject(item: VaultItem, projectId: string): boolean {
    if (item.primary_project_id === projectId) return true;
    const junctions = this.junctions.projectsFor(item.id)();
    return junctions.some(j => j.project_id === projectId);
  }

  private itemTimestamp(item: VaultItem): string {
    return item.latest_activity_at ?? item.created_at;
  }
}
