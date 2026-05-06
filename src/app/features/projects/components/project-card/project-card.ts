import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CdkDragHandle } from '@angular/cdk/drag-drop';
import { UiCluster } from '@shared/components/ui-cluster/ui-cluster';
import type { Project } from '@domain/projects';
import type { ProjectId } from '@domain/ids';

@Component({
  selector: 'app-project-card',
  imports: [RouterLink, CdkDragHandle, UiCluster],
  templateUrl: './project-card.html',
  styleUrl: './project-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.project-card--major]': 'project().kind === "major"',
    '[class.project-card--minor]': 'project().kind === "minor"',
    '[style.--project-accent]': 'project().color_token',
    'class': 'project-card',
  },
})
export class ProjectCard {
  readonly project = input.required<Project>();
  readonly showDragHandle = input(false);

  readonly removed = output<ProjectId>();
}
