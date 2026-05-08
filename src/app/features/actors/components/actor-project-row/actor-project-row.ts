import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import type { Project } from '@domain/projects';

@Component({
  selector: 'app-actor-project-row',
  imports: [RouterLink, UiBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a [routerLink]="['/projects', project().id]" class="actor-project-row">
      <span class="actor-project-row__name">{{ project().display_name }}</span>
      <app-ui-badge [tone]="project().status === 'active' ? 'success' : 'neutral'">
        {{ project().status }}
      </app-ui-badge>
    </a>
  `,
  styles: [`
    .actor-project-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.4rem 0;
      text-decoration: none;
      color: inherit;
    }
    .actor-project-row:hover .actor-project-row__name {
      text-decoration: underline;
    }
    .actor-project-row__name {
      flex: 1;
      font-size: 0.875rem;
    }
  `],
})
export class ActorProjectRow {
  readonly project = input.required<Project>();
}
