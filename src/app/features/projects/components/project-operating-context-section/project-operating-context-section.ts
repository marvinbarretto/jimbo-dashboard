import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import type { MentionTrigger } from '@shared/mentions';
import type { Project, UpdateProjectPayload } from '@domain/projects';
import { ProjectBriefField } from '../project-brief-field/project-brief-field';

// Entry points / conventions / footguns / deploy target / observability only
// mean something for a project with an actual codebase — a travel-planning
// or life-admin project has none of these. Self-contained relevance check
// (no repo_url or member repos ⇒ render nothing) rather than the parent page
// deciding per-section what applies to this project.
@Component({
  selector: 'app-project-operating-context-section',
  imports: [UiSection, UiStack, ProjectBriefField],
  templateUrl: './project-operating-context-section.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectOperatingContextSection {
  readonly project  = input.required<Project>();
  readonly triggers = input<MentionTrigger[]>([]);

  readonly saved = output<UpdateProjectPayload>();

  readonly isRelevant = computed(() => {
    const p = this.project();
    return !!p.repo_url || !!(p.repos && p.repos.length > 0);
  });

  // Repo-synced projects mirror these fields from docs/project.md — read-only
  // here, same rule the parent page applies to the rest of the brief.
  readonly fieldsReadonly = computed(() => !!this.project().synced_at);
}
