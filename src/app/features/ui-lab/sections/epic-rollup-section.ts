import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EpicRollup } from '@shared/components/epic-rollup/epic-rollup';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';

@Component({
  selector: 'app-epic-rollup-section',
  imports: [EpicRollup, UiSection, UiStack],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../lab-utils.scss'],
  template: `
    <app-ui-section title="Epic Rollup" [collapsible]="false">
      <app-ui-stack gap="md">
        <p class="ui-lab__support-copy">
          One block per child, coloured by lifecycle position. The summary tells you at a
          glance how the epic is progressing — and surfaces failures by name.
        </p>

        <div>
          <p class="ui-lab__subhead">Mid-flight epic — 2 done, 1 running, 1 ready</p>
          <app-epic-rollup [children]="midFlight" />
        </div>

        <div>
          <p class="ui-lab__subhead">Hit a snag — 3 done, 1 failed</p>
          <app-epic-rollup [children]="failed" />
        </div>

        <div>
          <p class="ui-lab__subhead">Still grooming — 0/2 done</p>
          <app-epic-rollup [children]="grooming" />
        </div>

        <div>
          <p class="ui-lab__subhead">Empty</p>
          <app-epic-rollup [children]="empty" />
        </div>
      </app-ui-stack>
    </app-ui-section>
  `,
})
export class EpicRollupSection {
  readonly midFlight = [
    { seq: 2410, state: 'completed' as const },
    { seq: 2411, state: 'completed' as const },
    { seq: 2412, state: 'running'   as const },
    { seq: 2413, state: 'ready'     as const },
  ];
  readonly failed = [
    { seq: 2420, state: 'completed' as const },
    { seq: 2421, state: 'completed' as const },
    { seq: 2422, state: 'completed' as const },
    { seq: 2423, state: 'failed'    as const },
  ];
  readonly grooming = [
    { seq: 2430, state: 'grooming' as const },
    { seq: 2431, state: 'grooming' as const },
  ];
  readonly empty = [];
}
