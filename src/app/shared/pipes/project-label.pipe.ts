import { Pipe, PipeTransform } from '@angular/core';

/**
 * Renders a project id (e.g. `"4"`) as its human label (e.g. `"Jimbo/Hermes"`),
 * falling back to the id if the projects map doesn't know it. Pass the active
 * projects map as the arg so the pipe stays pure but still re-evaluates when
 * the underlying signal updates.
 */
@Pipe({ name: 'projectLabel', pure: true })
export class ProjectLabelPipe implements PipeTransform {
  transform(id: string | null | undefined, projects: ReadonlyMap<string, string>): string {
    if (!id) return '';
    return projects.get(id) ?? id;
  }
}
