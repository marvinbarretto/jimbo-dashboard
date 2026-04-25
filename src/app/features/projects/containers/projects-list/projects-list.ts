import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProjectsService } from '../../data-access/projects.service';

@Component({
  selector: 'app-projects-list',
  imports: [RouterLink],
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
}
