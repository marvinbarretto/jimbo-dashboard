import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TableShell } from '@shared/components/table-shell/table-shell';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { UiCluster } from '@shared/components/ui-cluster/ui-cluster';
import { UiPageHeader } from '@shared/components/ui-page-header/ui-page-header';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { DatetimePipe } from '@shared/pipes/datetime.pipe';

interface LabProjectRow {
  readonly id: string;
  readonly displayName: string;
  readonly status: 'active' | 'archived';
  readonly owner: string;
  readonly createdAt: string;
}

@Component({
  selector: 'app-list-workflow-section',
  imports: [RouterLink, TableShell, UiBadge, UiCluster, UiPageHeader, UiSection, UiStack, DatetimePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../lab-utils.scss'],
  template: `
    <app-ui-section title="Typical List Workflow" [collapsible]="false">
      <app-ui-stack gap="md">
        <app-ui-page-header>
          <h2 uiPageHeaderTitle>Projects</h2>
          <p uiPageHeaderHint>
            Browse rows, scan status quickly, and jump to the entity or advanced edit.
          </p>
          <a uiPageHeaderActions routerLink="/projects/new" class="btn btn--primary">Add project</a>
        </app-ui-page-header>

        <app-table-shell>
          <table class="ui-lab__table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Display name</th>
                <th>Status</th>
                <th>Owner</th>
                <th>Created</th>
                <th aria-label="Actions"></th>
              </tr>
            </thead>
            <tbody>
              @for (project of sampleProjects; track project.id) {
                <tr [class.ui-lab__table-row--muted]="project.status === 'archived'">
                  <td><code>{{ project.id }}</code></td>
                  <td>{{ project.displayName }}</td>
                  <td>
                    <app-ui-badge [tone]="project.status === 'active' ? 'success' : 'neutral'">
                      {{ project.status }}
                    </app-ui-badge>
                  </td>
                  <td>{{ project.owner }}</td>
                  <td>{{ project.createdAt | datetime }}</td>
                  <td class="ui-lab__actions">
                    <app-ui-cluster justify="end" gap="sm">
                      <a [routerLink]="['/projects', project.id]">View</a>
                      <a [routerLink]="['/projects', project.id, 'edit']">Advanced edit</a>
                    </app-ui-cluster>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </app-table-shell>
      </app-ui-stack>
    </app-ui-section>
  `,
})
export class ListWorkflowSection {
  protected readonly sampleProjects: readonly LabProjectRow[] = [
    { id: 'hermes',     displayName: 'Hermes',     status: 'active',   owner: '@marvin', createdAt: '2026-04-12T09:00:00.000Z' },
    { id: 'dashboard',  displayName: 'Dashboard',  status: 'active',   owner: '@ralph',  createdAt: '2026-04-18T14:32:00.000Z' },
    { id: 'localshout', displayName: 'Localshout', status: 'archived', owner: '@boris',  createdAt: '2026-03-04T11:15:00.000Z' },
  ];
}
