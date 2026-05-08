import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ActorChip } from '@shared/components/actor-chip/actor-chip';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiCluster } from '@shared/components/ui-cluster/ui-cluster';
import { actorId } from '@domain/ids';

// Demo wrappers that set --proj-tint inline so the project stripe renders.
// In production, the wrapping vault-card propagates the tint via host binding.
@Component({
  selector: 'app-actor-chip-section',
  imports: [ActorChip, UiSection, UiStack, UiCluster],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../lab-utils.scss'],
  template: `
    <app-ui-section title="Actor Chip" [collapsible]="false">
      <app-ui-stack gap="md">
        <p class="ui-lab__support-copy">
          Avatar + name. Picks up <code>--proj-tint</code> from its container as a left stripe
          (the project the actor is acting on). Compact mode renders just the avatar — for
          dense surfaces (mention rows, notification dots) where the actor is connected but
          not primary content.
        </p>

        <div>
          <p class="ui-lab__subhead">Primary · full name + project stripe</p>
          <app-ui-cluster gap="md">
            <span style="--proj-tint: #6b95d6;"><app-actor-chip [actor]="marvin" /></span>
            <span style="--proj-tint: #5fb3a1;"><app-actor-chip [actor]="ralph" /></span>
            <span style="--proj-tint: #a878d6;"><app-actor-chip [actor]="boris" /></span>
            <span style="--proj-tint: #e08850;"><app-actor-chip [actor]="jimbo" /></span>
          </app-ui-cluster>
        </div>

        <div>
          <p class="ui-lab__subhead">No stripe · standalone surfaces</p>
          <app-ui-cluster gap="md">
            <app-actor-chip [actor]="marvin" [stripe]="false" />
            <app-actor-chip [actor]="ralph"  [stripe]="false" />
            <app-actor-chip [actor]="boris"  [stripe]="false" />
            <app-actor-chip [actor]="jimbo"  [stripe]="false" />
          </app-ui-cluster>
        </div>

        <div>
          <p class="ui-lab__subhead">Compact · avatar only</p>
          <app-ui-cluster gap="md">
            <app-actor-chip [actor]="marvin" [compact]="true" />
            <app-actor-chip [actor]="ralph"  [compact]="true" />
            <app-actor-chip [actor]="boris"  [compact]="true" />
            <app-actor-chip [actor]="jimbo"  [compact]="true" />
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
