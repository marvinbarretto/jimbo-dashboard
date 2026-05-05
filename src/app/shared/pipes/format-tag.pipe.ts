import { Pipe, PipeTransform } from '@angular/core';

/**
 * Rewrites a tag for display. Today: `project:N` → `project:<label>` when the
 * id is known. Other tags pass through unchanged. Pass the active projects
 * map as the arg so the pipe stays pure and re-evaluates when it loads.
 */
@Pipe({ name: 'formatTag', pure: true })
export class FormatTagPipe implements PipeTransform {
  transform(tag: string, projects: ReadonlyMap<string, string>): string {
    const m = tag.match(/^project:(.+)$/);
    if (!m) return tag;
    const label = projects.get(m[1]);
    return label ? `project:${label}` : tag;
  }
}
