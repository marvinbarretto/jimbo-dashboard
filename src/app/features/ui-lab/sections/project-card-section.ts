import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { ProjectCard } from '../../projects/components/project-card/project-card';
import type { Project } from '@domain/projects';

@Component({
  selector: 'app-project-card-section',
  imports: [UiSection, UiStack, ProjectCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../lab-utils.scss'],
  template: `
    <app-ui-section title="Project Card" [collapsible]="false">
      <app-ui-stack gap="md">
        <p class="ui-lab__support-copy">
          Project card with color-dot accent, optional drag handle, repo link, description, owner,
          and edit/remove actions. Major projects get a colored left border; minor projects use
          the muted border. Input: <code>project</code> (required), <code>showDragHandle</code>.
          Output: <code>removed</code> emits the <code>ProjectId</code>.
        </p>

        <div class="ui-lab__subhead">Major — with drag handle and repo</div>
        <div style="max-width: 320px;">
          <app-project-card [project]="labProjects[0]" [showDragHandle]="true"
                            (removed)="labRemovedId.set($event)" />
        </div>

        <div class="ui-lab__subhead">Minor — no repo</div>
        <div style="max-width: 320px;">
          <app-project-card [project]="labProjects[1]"
                            (removed)="labRemovedId.set($event)" />
        </div>

        <div class="ui-lab__subhead">Archived</div>
        <div style="max-width: 320px;">
          <app-project-card [project]="labProjects[2]"
                            (removed)="labRemovedId.set($event)" />
        </div>

        @if (labRemovedId()) {
          <p class="ui-lab__support-copy">
            Last removed: <code>{{ labRemovedId() }}</code>
          </p>
        }
      </app-ui-stack>
    </app-ui-section>
  `,
})
export class ProjectCardSection {
  protected readonly labProjects: readonly Project[] = [
    {
      id: 'localshout' as any,
      display_name: 'Localshout',
      description: 'Hyper-local event discovery and community platform.',
      status: 'active',
      kind: 'major',
      owner_actor_id: 'marvin' as any,
      criteria: null,
      repo_url: 'https://github.com/example/localshout',
      color_token: '#c47a8f',
      created_at: '2026-01-10T09:00:00.000Z',
    },
    {
      id: 'hermes' as any,
      display_name: 'Hermes',
      description: 'AI agent orchestration layer.',
      status: 'active',
      kind: 'minor',
      owner_actor_id: 'marvin' as any,
      criteria: null,
      repo_url: null,
      color_token: '#7a8fc4',
      created_at: '2026-02-01T09:00:00.000Z',
    },
    {
      id: 'personal' as any,
      display_name: 'Personal admin',
      description: null,
      status: 'archived',
      kind: 'minor',
      owner_actor_id: 'boris' as any,
      criteria: null,
      repo_url: null,
      color_token: '#c4a47a',
      created_at: '2025-11-15T09:00:00.000Z',
    },
  ];
  protected labRemovedId = signal<string | null>(null);
}
