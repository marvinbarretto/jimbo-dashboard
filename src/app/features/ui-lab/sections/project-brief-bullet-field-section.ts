import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { UiPageHeader } from '@shared/components/ui-page-header/ui-page-header';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { ProjectBriefBulletField } from '../../projects/components/project-brief-bullet-field/project-brief-bullet-field';
import { ProjectsService } from '../../projects/data-access/projects.service';
import { ActorsService } from '../../actors/data-access/actors.service';
import { briefActorProjectTrigger, briefVaultItemTrigger } from '../../projects/util/brief-mention-triggers';

// Isolates the exact configuration behind the reported project-page freeze:
// ProjectBriefBulletField (checkable: false, real @/~ mention triggers hitting
// the live ProjectsService/ActorsService/vault search — not fakes), with TWO
// fields on the page at once (mirroring Intent + Success criteria both being
// present on project-landing simultaneously). Reproduce here before touching
// project-landing again — this page has none of its surrounding complexity
// (epics, activity feed, constraints, dispatch queue), so if it freezes here
// too, the bug is in this exact chain (UiChecklist → UiInlineEdit →
// MentionDirective/MentionService), not something project-landing-specific.
@Component({
  selector: 'app-project-brief-bullet-field-section',
  imports: [UiPageHeader, UiSection, UiStack, ProjectBriefBulletField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-ui-stack gap="lg">
      <app-ui-page-header>
        <h2 uiPageHeaderTitle>Project Brief Bullet Field — isolation</h2>
        <p uiPageHeaderHint>
          Same wiring as project-landing's Intent/Success-criteria fields: real mention
          triggers (@ for actors/projects, ~ for live vault search over HttpClient), two
          fields on the page at once. Type a bullet, try @ and ~ mid-edit, commit via
          Enter and via blur, try removing a row while a mention popup is open.
        </p>
      </app-ui-page-header>

      <app-ui-section title="Field 1 — mimics Intent" [collapsible]="false">
        <app-project-brief-bullet-field
          label="Intent"
          [value]="field1()"
          placeholder="+ add a point (Enter)"
          [triggers]="triggers"
          (saved)="field1.set($event)"
        />
        <pre class="lab-raw">{{ field1() }}</pre>
      </app-ui-section>

      <app-ui-section title="Field 2 — mimics Success criteria" [collapsible]="false">
        <app-project-brief-bullet-field
          label="Success criteria"
          [value]="field2()"
          placeholder="+ add a criterion (Enter)"
          [triggers]="triggers"
          (saved)="field2.set($event)"
        />
        <pre class="lab-raw">{{ field2() }}</pre>
      </app-ui-section>
    </app-ui-stack>
  `,
  styles: [`
    .lab-raw {
      margin: 0.5rem 0 0;
      padding: 0.5rem 0.75rem;
      font-size: 0.72rem;
      background: var(--color-surface-soft, var(--color-surface));
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      white-space: pre-wrap;
      color: var(--color-text-muted);
    }
  `],
})
export class ProjectBriefBulletFieldSection {
  private readonly projects = inject(ProjectsService);
  private readonly actors = inject(ActorsService);
  private readonly http = inject(HttpClient);

  // Same triggers array shape as ProjectLanding.briefTriggers — real services,
  // real HTTP-backed vault search, not stubs.
  protected readonly triggers = [
    briefActorProjectTrigger(this.projects.activeProjects, this.actors.activeActors),
    briefVaultItemTrigger(this.http),
  ];

  protected readonly field1 = signal<string | null>(
    'Get Marvin (and possibly 4-6 friends) to the Edinburgh Fringe ~19-24 Aug 2026 cheaply and well-organised, with Jimbo handling research, price watching, and deadline nudges',
  );
  protected readonly field2 = signal<string | null>(
    '- Travel + accommodation booked before prices spike\n- Group size locked or solo confirmed\n- At least one hike day scheduled',
  );
}
