import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ProjectId } from '@domain/ids';

// Small pill showing a project's display name with a project-tinted border.
// Tint comes from --project-color-{id} CSS variables defined in styles.scss.
// Falls back to muted styling for projects without a colour token.
@Component({
  selector: 'app-project-chip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span [class]="cls()" [attr.title]="displayName()">{{ displayName() }}</span>`,
  styles: [`
    .project-chip {
      font-size: 0.6rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      padding: 0.05rem 0.4rem;
      border: 1px solid var(--color-border);
      border-radius: 3px;
      color: var(--color-text-muted);
      cursor: help;
      line-height: 1.4;
    }
    .project-chip--hermes     { color: var(--project-color-hermes);     border-color: color-mix(in srgb, var(--project-color-hermes)     50%, var(--color-border)); }
    .project-chip--localshout { color: var(--project-color-localshout); border-color: color-mix(in srgb, var(--project-color-localshout) 50%, var(--color-border)); }
    .project-chip--dashboard  { color: var(--project-color-dashboard);  border-color: color-mix(in srgb, var(--project-color-dashboard)  50%, var(--color-border)); }
    .project-chip--personal   { color: var(--project-color-personal);   border-color: color-mix(in srgb, var(--project-color-personal)   50%, var(--color-border)); }
  `],
})
export class ProjectChip {
  readonly projectId   = input.required<ProjectId | string>();
  readonly displayName = input.required<string>();

  readonly cls = computed(() => `project-chip project-chip--${this.projectId()}`);
}
