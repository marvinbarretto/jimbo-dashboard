import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ProjectAvatar } from '@shared/components/project-avatar/project-avatar';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiCluster } from '@shared/components/ui-cluster/ui-cluster';

@Component({
  selector: 'app-project-avatar-section',
  imports: [ProjectAvatar, UiSection, UiStack, UiCluster],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../lab-utils.scss'],
  template: `
    <app-ui-section title="Project Avatar" [collapsible]="false">
      <app-ui-stack gap="md">
        <p class="ui-lab__support-copy">
          Initials in a circle, filled with the project's colour token. Initials come from
          CamelCase / whitespace boundaries: "LocalShout" → LS, "Reinvent Me" → RM,
          single-token names get a single letter.
        </p>

        <div class="ui-lab__rules">
          <p class="ui-lab__subhead">When to use — and when NOT</p>
          <ul class="ui-lab__rule-list">
            <li>
              <strong>Not on vault cards.</strong> Cards carry project identity in the
              full-bleed header strip, not as an avatar. Mixing both would make the
              card-level project signal read twice.
            </li>
            <li>
              <strong>Yes</strong> in dense list rows or sidebars where space is too
              tight for a full project name pill and the project needs a glance-level
              marker.
            </li>
            <li>
              <strong>Shape rule:</strong> actor = circle, project = rounded square.
              When the avatar IS used (rare contexts), the squared corners distinguish
              it from an actor avatar at a glance — colour alone isn't enough.
            </li>
          </ul>
        </div>

        <div>
          <p class="ui-lab__subhead">Default · filled</p>
          <app-ui-cluster gap="md">
            <app-project-avatar name="LocalShout" color="#c47a8f" />
            <app-project-avatar name="Hermes"     color="#7a8fc4" />
            <app-project-avatar name="Dashboard"  color="#7ac4a4" />
            <app-project-avatar name="Personal"   color="#c4a47a" />
            <app-project-avatar name="Reinvent Me" color="#9c7ac4" />
          </app-ui-cluster>
        </div>

        <div>
          <p class="ui-lab__subhead">Outlined — when filled would compete with state</p>
          <app-ui-cluster gap="md">
            <app-project-avatar name="LocalShout" color="#c47a8f" variant="outlined" />
            <app-project-avatar name="Hermes"     color="#7a8fc4" variant="outlined" />
            <app-project-avatar name="Dashboard"  color="#7ac4a4" variant="outlined" />
          </app-ui-cluster>
        </div>

        <div>
          <p class="ui-lab__subhead">Sizes</p>
          <app-ui-cluster gap="md">
            <app-project-avatar name="LocalShout" color="#c47a8f" size="sm" />
            <app-project-avatar name="LocalShout" color="#c47a8f" size="md" />
            <app-project-avatar name="LocalShout" color="#c47a8f" size="lg" />
          </app-ui-cluster>
        </div>

        <div>
          <p class="ui-lab__subhead">Missing colour token — falls back to border tint</p>
          <app-ui-cluster gap="md">
            <app-project-avatar name="Unstyled Project" />
          </app-ui-cluster>
        </div>
      </app-ui-stack>
    </app-ui-section>
  `,
})
export class ProjectAvatarSection {}
