import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { Dialog } from '@angular/cdk/dialog';
import { UiAddTile } from '@shared/components/ui-add-tile/ui-add-tile';
import { UiPageHeader } from '@shared/components/ui-page-header/ui-page-header';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { EntityChip } from '@shared/components/entity-chip/entity-chip';
import type { Project, ProjectKind } from '@domain/projects';
import type { ProjectId } from '@domain/ids';
import { ProjectsService } from '../../data-access/projects.service';
import { ProjectCard } from '../../components/project-card/project-card';
import { ProjectFormDialog, type ProjectFormDialogData } from '../project-form-dialog/project-form-dialog';
import { VaultItemsService } from '../../../vault-items/data-access/vault-items.service';

@Component({
  selector: 'app-projects-list',
  imports: [RouterLink, CdkDrag, CdkDropList, UiAddTile, UiPageHeader, UiStack, EntityChip, ProjectCard],
  templateUrl: './projects-list.html',
  styleUrl: './projects-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectsList {
  private readonly service = inject(ProjectsService);
  private readonly vaultItems = inject(VaultItemsService);
  private readonly dialog = inject(Dialog);

  readonly majorProjects = computed(() =>
    this.service.projects().filter(p => p.status === 'active' && p.kind === 'major')
  );

  readonly minorProjects = computed(() =>
    this.service.projects().filter(p => p.status === 'active' && p.kind === 'minor')
  );

  readonly adminProjects = computed(() =>
    this.service.projects().filter(p => p.status === 'active' && p.kind === 'admin')
  );

  readonly archivedProjects = computed(() =>
    this.service.projects().filter(p => p.status === 'archived')
  );

  // 20 most recent — sort by latest activity (falling back to created_at)
  // so the list surfaces what's actually being worked on.
  readonly epics = computed(() =>
    this.vaultItems.items()
      .filter(i => i.is_epic)
      .slice()
      .sort((a, b) => (b.latest_activity_at ?? b.created_at).localeCompare(a.latest_activity_at ?? a.created_at))
      .slice(0, 20)
  );

  onDrop(event: CdkDragDrop<Project[]>, targetKind: ProjectKind): void {
    if (event.previousContainer === event.container) return;
    const project: Project = event.item.data;
    this.service.update(project.id, { kind: targetKind });
  }

  projectColor(id: string | null | undefined): string | null {
    return id ? this.service.getById(id)?.color_token ?? null : null;
  }

  remove(id: ProjectId): void {
    if (confirm(`Remove project ${id}?`)) {
      this.service.remove(id);
    }
  }

  openCreate(kind: ProjectKind): void {
    this.dialog.open<ProjectId | null, ProjectFormDialogData>(ProjectFormDialog, {
      data: { kind },
      panelClass: 'project-form-dialog',
      ariaModal: true,
      autoFocus: 'first-tabbable',
      restoreFocus: true,
      hasBackdrop: true,
    });
  }

  statusTone(status: string): 'success' | 'neutral' {
    return status === 'active' ? 'success' : 'neutral';
  }
}
