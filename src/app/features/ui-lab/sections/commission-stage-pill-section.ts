import { ChangeDetectionStrategy, Component } from '@angular/core';
import { COMMISSION_STAGE_ORDER } from '@domain/dispatch';
import { CommissionStagePill } from '@shared/components/commission-stage-pill/commission-stage-pill';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiCluster } from '@shared/components/ui-cluster/ui-cluster';

@Component({
  selector: 'app-commission-stage-pill-section',
  imports: [CommissionStagePill, UiSection, UiStack, UiCluster],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../lab-utils.scss'],
  template: `
    <app-ui-section title="Commission Stage Pill" [collapsible]="false">
      <app-ui-stack gap="md">
        <p class="ui-lab__support-copy">
          Atom — the lifecycle stage of an item's commission on the execution board.
          <code>proposed</code> (awaiting approval) and <code>rejected</code> (a deliberate
          decline) are distinct from <code>approved</code>/<code>failed</code>, so the board
          never reads a queued item as greenlit or a decline as a crash. <code>completed</code>
          is "finished, PR status unreported" (common until the worker populates pr_url).
        </p>
        <app-ui-cluster gap="md">
          @for (stage of stages; track stage) {
            <app-commission-stage-pill [stage]="stage" />
          }
        </app-ui-cluster>
      </app-ui-stack>
    </app-ui-section>
  `,
})
export class CommissionStagePillSection {
  readonly stages = COMMISSION_STAGE_ORDER;
}
