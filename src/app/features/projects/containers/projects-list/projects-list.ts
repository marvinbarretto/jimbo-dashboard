import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { UiCluster } from '@shared/components/ui-cluster/ui-cluster';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiPageHeader } from '@shared/components/ui-page-header/ui-page-header';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { TableShell } from '@shared/components/table-shell/table-shell';
import { ProjectsService } from '../../data-access/projects.service';

@Component({
  selector: 'app-projects-list',
  imports: [RouterLink, TableShell, UiBadge, UiCluster, UiEmptyState, UiPageHeader, UiStack],
  templateUrl: './projects-list.html',
  styleUrl: './projects-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectsList {
  private readonly service = inject(ProjectsService);

  readonly projects = this.service.projects;

  remove(id: string): void {
    if (confirm(`Remove project ${id}?`)) {
      this.service.remove(id);
    }
  }

  statusTone(status: string): 'success' | 'neutral' {
    return status === 'active' ? 'success' : 'neutral';
  }
}
