import { ChangeDetectionStrategy, Component, TemplateRef, inject, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { type CellContext, createColumnHelper, type ColumnDef } from '@tanstack/angular-table';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { UiCluster } from '@shared/components/ui-cluster/ui-cluster';
import { UiDataTable } from '@shared/components/ui-data-table/ui-data-table';
import { UiPageHeader } from '@shared/components/ui-page-header/ui-page-header';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import type { Project } from '@domain/projects';
import { ProjectsService } from '../../data-access/projects.service';

@Component({
  selector: 'app-projects-list',
  imports: [RouterLink, UiBadge, UiCluster, UiDataTable, UiPageHeader, UiStack],
  templateUrl: './projects-list.html',
  styleUrl: './projects-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectsList {
  private readonly service = inject(ProjectsService);

  readonly projects = this.service.projects;
  private readonly idCell =
    viewChild.required<TemplateRef<{ $implicit: CellContext<Project, Project['id']> }>>('idCell');
  private readonly columnHelper = createColumnHelper<Project>();
  private readonly statusCell =
    viewChild.required<TemplateRef<{ $implicit: CellContext<Project, Project['status']> }>>('statusCell');
  private readonly actionsCell =
    viewChild.required<TemplateRef<{ $implicit: CellContext<Project, string> }>>('actionsCell');

  readonly columns: ColumnDef<Project, any>[] = [
    this.columnHelper.accessor('id', {
      header: 'ID',
      cell: () => this.idCell(),
    }),
    this.columnHelper.accessor('display_name', {
      header: 'Display name',
    }),
    this.columnHelper.accessor('status', {
      header: 'Status',
      cell: () => this.statusCell(),
    }),
    this.columnHelper.accessor('owner_actor_id', {
      header: 'Owner',
    }),
    this.columnHelper.accessor(row => row.created_at.slice(0, 10), {
      id: 'created_at',
      header: 'Created',
      sortingFn: 'alphanumeric',
    }),
    this.columnHelper.accessor('id', {
      id: 'actions',
      header: '',
      enableSorting: false,
      cell: () => this.actionsCell(),
    }),
  ];

  readonly projectRowClass = (project: Project): string =>
    project.status === 'archived' ? 'archived' : '';

  remove(id: string): void {
    if (confirm(`Remove project ${id}?`)) {
      this.service.remove(id);
    }
  }

  statusTone(status: string): 'success' | 'neutral' {
    return status === 'active' ? 'success' : 'neutral';
  }
}
