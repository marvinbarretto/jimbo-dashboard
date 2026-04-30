import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { formatPageTitle } from '@app/app-title-strategy';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { UiBackLink } from '@shared/components/ui-back-link/ui-back-link';
import { UiCard } from '@shared/components/ui-card/ui-card';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiMetaList } from '@shared/components/ui-meta-list/ui-meta-list';
import { UiPageHeader } from '@shared/components/ui-page-header/ui-page-header';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { ProjectsService } from '../../data-access/projects.service';
import { ProjectActivityEventsService } from '../../data-access/project-activity-events.service';
import { ActorsService } from '../../../actors/data-access/actors.service';
import type { ProjectActivityEvent } from '@domain/activity/activity-event';
import type { ActorId } from '@domain/ids';

@Component({
  selector: 'app-project-detail',
  imports: [RouterLink, UiBackLink, UiBadge, UiCard, UiEmptyState, UiMetaList, UiPageHeader, UiSection, UiStack],
  templateUrl: './project-detail.html',
  styleUrl: './project-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectDetail {
  private readonly service = inject(ProjectsService);
  private readonly actorsService = inject(ActorsService);
  private readonly activityService = inject(ProjectActivityEventsService);
  private readonly route = inject(ActivatedRoute);
  private readonly titleService = inject(Title);

  private readonly id = toSignal(this.route.paramMap.pipe(map(p => p.get('id') ?? '')));

  readonly project = computed(() => this.service.getById(this.id() ?? ''));

  // Resolve owner details for display. Falls back to the raw id string if the
  // actor row is unknown (actor deleted, data drift, etc.).
  readonly owner = computed(() => {
    const p = this.project();
    return p ? this.actorsService.getById(p.owner_actor_id) : undefined;
  });

  // Project activity timeline — re-fetches when the route id changes.
  readonly events = computed(() => {
    const p = this.project();
    return p ? this.activityService.eventsFor(p.id)() : [];
  });

  constructor() {
    effect(() => {
      const p = this.project();
      if (p) this.activityService.loadFor(p.id);
    });

    effect(() => {
      const p = this.project();
      if (p) this.titleService.setTitle(formatPageTitle(p.display_name));
    });
  }

  actorDisplay(actorIdStr: ActorId): string {
    const actor = this.actorsService.getById(actorIdStr);
    return actor ? `@${actor.id}` : `@${actorIdStr}`;
  }

  eventDescription(event: ProjectActivityEvent): string {
    switch (event.type) {
      case 'project_created':
        return 'created this project';
      case 'project_criteria_changed':
        return 'updated criteria';
      case 'project_owner_changed': {
        const from = this.actorDisplay(event.from_actor_id);
        const to   = this.actorDisplay(event.to_actor_id);
        return `transferred ownership ${from} → ${to}`;
      }
      case 'project_archived':
        return 'archived this project';
      case 'project_unarchived':
        return 'unarchived this project';
    }
  }

  relativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  statusTone(status: string): 'success' | 'neutral' {
    return status === 'active' ? 'success' : 'neutral';
  }
}
