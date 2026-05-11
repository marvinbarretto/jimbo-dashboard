import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ActorChip } from '@shared/components/actor-chip/actor-chip';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiCluster } from '@shared/components/ui-cluster/ui-cluster';
import { actorId } from '@domain/ids';

@Component({
  selector: 'app-actor-chip-section',
  imports: [ActorChip, UiSection, UiStack, UiCluster],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../lab-utils.scss'],
  template: `
    <app-ui-section title="Actor Chip" [collapsible]="false">
      <app-ui-stack gap="md">
        <p class="ui-lab__support-copy">
          Monochrome name in a pill border. The full-identity treatment for actors —
          use this anywhere an actor needs to be named on a surface (card owners,
          dispatch headers, mention strips). For the dense / icon-only treatment,
          reach for <code>app-actor-avatar</code>.
        </p>

        <div>
          <p class="ui-lab__subhead">Pill</p>
          <app-ui-cluster gap="md">
            <app-actor-chip [actor]="marvin" />
            <app-actor-chip [actor]="ralph" />
            <app-actor-chip [actor]="boris" />
            <app-actor-chip [actor]="jimbo" />
          </app-ui-cluster>
        </div>
      </app-ui-stack>
    </app-ui-section>
  `,
})
export class ActorChipSection {
  readonly marvin = actorId('marvin');
  readonly ralph  = actorId('ralph');
  readonly boris  = actorId('boris');
  readonly jimbo  = actorId('jimbo');
}
