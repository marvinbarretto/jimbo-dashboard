import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ActorAvatar } from '@shared/components/actor-avatar/actor-avatar';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiCluster } from '@shared/components/ui-cluster/ui-cluster';
import { actorId } from '@domain/ids';

@Component({
  selector: 'app-actor-avatar-section',
  imports: [ActorAvatar, UiSection, UiStack, UiCluster],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../lab-utils.scss'],
  template: `
    <app-ui-section title="Actor Avatar" [collapsible]="false">
      <app-ui-stack gap="md">
        <p class="ui-lab__support-copy">
          Monochrome outlined ring with the actor's monogram inside. Filled is a high-emphasis
          variant for headers / "you" treatments. No actor colour anywhere — actors are
          intentionally monochrome so the primary palette stays free for state.
        </p>

        <div>
          <p class="ui-lab__subhead">Default · outlined ring</p>
          <app-ui-cluster gap="md">
            <app-actor-avatar [actor]="marvin" />
            <app-actor-avatar [actor]="kipper" />
            <app-actor-avatar [actor]="boris" />
            <app-actor-avatar [actor]="jimbo" />
          </app-ui-cluster>
        </div>

        <div>
          <p class="ui-lab__subhead">Filled — high-emphasis only</p>
          <app-ui-cluster gap="md">
            <app-actor-avatar [actor]="marvin" variant="filled" />
            <app-actor-avatar [actor]="kipper"  variant="filled" />
            <app-actor-avatar [actor]="boris"  variant="filled" />
            <app-actor-avatar [actor]="jimbo"  variant="filled" />
          </app-ui-cluster>
        </div>

        <div>
          <p class="ui-lab__subhead">Sizes</p>
          <app-ui-cluster gap="md">
            <app-actor-avatar [actor]="marvin" size="sm" />
            <app-actor-avatar [actor]="marvin" size="md" />
            <app-actor-avatar [actor]="marvin" size="lg" />
          </app-ui-cluster>
        </div>
      </app-ui-stack>
    </app-ui-section>
  `,
})
export class ActorAvatarSection {
  readonly marvin = actorId('marvin');
  readonly kipper = actorId('kipper');
  readonly boris  = actorId('boris');
  readonly jimbo  = actorId('jimbo');
}
