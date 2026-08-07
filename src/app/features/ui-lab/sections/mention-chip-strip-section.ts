import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { UiMentionChipStrip, type MentionRelatedRef } from '@shared/components/ui-mention-chip-strip/ui-mention-chip-strip';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiCluster } from '@shared/components/ui-cluster/ui-cluster';
import { UiButton } from '@shared/components/ui-button/ui-button';
import { actorId, projectId, vaultItemId , wellKnownActorId} from '@domain/ids';
import type { Project } from '@domain/projects/project';
import { EMPTY_PROJECT_BRIEF } from '@domain/projects/project';
import type { Actor } from '@domain/actors/actor';

const HERMES: Project = {
  id: projectId('hermes'),
  display_name: 'hermes',
  description: null,
  status: 'active',
  kind: 'minor',
  owner_actor_id: wellKnownActorId('marvin'),
  criteria: null,
  repo_url: null,
  color_token: '#7c3aed',
  short_code: 'HRM',
  created_at: '2026-01-01T00:00:00Z',
  synced_at: null, synced_commit: null, repos: null, ...EMPTY_PROJECT_BRIEF,
};

const BORIS: Actor = {
  id: wellKnownActorId('boris'),
  display_name: 'boris',
  kind: 'agent',
  runtime: 'anthropic',
  description: null,
  is_active: true,
  serves: [],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

@Component({
  selector: 'app-mention-chip-strip-section',
  imports: [UiMentionChipStrip, UiSection, UiStack, UiCluster, UiButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../lab-utils.scss'],
  template: `
    <app-ui-section title="Mention Chip Strip" [collapsible]="false">
      <app-ui-stack gap="lg">
        <p class="ui-lab__copy">
          Renders four chip categories — tags (<code>#</code>), projects (<code>@</code>),
          assignee (<code>@</code>), related items (<code>~</code>) — each with × to remove.
          Used by the unified vault-item dialog. Renders nothing when all categories are empty,
          so it can sit unconditionally in a layout.
        </p>

        <app-ui-mention-chip-strip
          [tags]="tags()"
          [projects]="projects()"
          [assignee]="assignee()"
          [related]="related()"
          (tagRemoved)="removeTag($event)"
          (projectRemoved)="removeProject($event)"
          (assigneeRemoved)="assignee.set(null)"
          (relatedRemoved)="removeRelated($event)"
        />

        <app-ui-cluster gap="sm">
          <app-ui-button size="sm" variant="secondary" (pressed)="addTag()">+ tag</app-ui-button>
          <app-ui-button size="sm" variant="secondary" (pressed)="addProject()">+ project</app-ui-button>
          <app-ui-button size="sm" variant="secondary" (pressed)="setAssignee()">set assignee</app-ui-button>
          <app-ui-button size="sm" variant="secondary" (pressed)="addRelated()">+ related</app-ui-button>
          <app-ui-button size="sm" variant="ghost" (pressed)="reset()">reset</app-ui-button>
        </app-ui-cluster>
      </app-ui-stack>
    </app-ui-section>
  `,
})
export class MentionChipStripSection {
  protected readonly tags = signal<readonly string[]>(['urgent', 'bug']);
  protected readonly projects = signal<readonly Project[]>([HERMES]);
  protected readonly assignee = signal<Actor | null>(BORIS);
  protected readonly related = signal<readonly MentionRelatedRef[]>([
    { id: vaultItemId('demo-1'), title: 'parent ticket', seq: 42 },
  ]);

  private nextTagId = 1;
  protected addTag(): void {
    const t = `tag-${this.nextTagId++}`;
    this.tags.update(arr => [...arr, t]);
  }
  protected removeTag(i: number): void {
    this.tags.update(arr => arr.filter((_, idx) => idx !== i));
  }
  protected addProject(): void {
    this.projects.update(arr => [...arr, { ...HERMES, id: projectId(`p-${arr.length}`), display_name: `project-${arr.length}` }]);
  }
  protected removeProject(i: number): void {
    this.projects.update(arr => arr.filter((_, idx) => idx !== i));
  }
  protected setAssignee(): void {
    this.assignee.set(BORIS);
  }
  protected addRelated(): void {
    this.related.update(arr => [
      ...arr,
      { id: vaultItemId(`r-${arr.length}`), title: `related-${arr.length}`, seq: 100 + arr.length },
    ]);
  }
  protected removeRelated(i: number): void {
    this.related.update(arr => arr.filter((_, idx) => idx !== i));
  }
  protected reset(): void {
    this.tags.set([]);
    this.projects.set([]);
    this.assignee.set(null);
    this.related.set([]);
  }
}
