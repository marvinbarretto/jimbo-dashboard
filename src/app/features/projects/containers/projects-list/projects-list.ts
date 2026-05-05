import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { UiCluster } from '@shared/components/ui-cluster/ui-cluster';
import { UiPageHeader } from '@shared/components/ui-page-header/ui-page-header';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { ProjectsService } from '../../data-access/projects.service';
import { VaultItemsService } from '../../../vault-items/data-access/vault-items.service';

@Component({
  selector: 'app-projects-list',
  imports: [RouterLink, UiBadge, UiCluster, UiPageHeader, UiStack],
  templateUrl: './projects-list.html',
  styleUrl: './projects-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectsList {
  private readonly service = inject(ProjectsService);
  private readonly vaultItems = inject(VaultItemsService);

  readonly majorProjects = computed(() =>
    this.service.projects().filter(p => p.status === 'active' && p.kind === 'major')
  );

  readonly minorProjects = computed(() =>
    this.service.projects().filter(p => p.status === 'active' && p.kind === 'minor')
  );

  readonly archivedProjects = computed(() =>
    this.service.projects().filter(p => p.status === 'archived')
  );

  readonly epics = computed(() =>
    this.vaultItems.items().filter(i => i.is_epic)
  );

  remove(id: string): void {
    if (confirm(`Remove project ${id}?`)) {
      this.service.remove(id);
    }
  }

  statusTone(status: string): 'success' | 'neutral' {
    return status === 'active' ? 'success' : 'neutral';
  }
}
