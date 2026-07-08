import { ChangeDetectionStrategy, Component } from '@angular/core';
import { JobChip, type JobChipKind, type JobChipState } from '@shared/components/job-chip/job-chip';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiCluster } from '@shared/components/ui-cluster/ui-cluster';

const KINDS: readonly JobChipKind[] = ['agent', 'script', 'fold'];
const STATES: readonly JobChipState[] = ['active', 'running', 'paused', 'failing', 'unknown'];

@Component({
  selector: 'app-job-chip-section',
  imports: [JobChip, UiSection, UiStack, UiCluster],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../lab-utils.scss'],
  template: `
    <app-ui-section title="Job Chip" [collapsible]="false">
      <app-ui-stack gap="md">
        <p class="ui-lab__support-copy">
          One chip for every place a Hermes job appears — pulse, control room, fleet folds,
          timelines — so kind and state read identically at a glance everywhere. Kind glyph +
          status dot + muted-when-paused label, with detail after a separator. Takes a
          <code>size</code> input — <code>sm</code> / <code>md</code> (default) / <code>lg</code>.
        </p>

        <div>
          <p class="ui-lab__subhead">Sizes</p>
          <app-ui-cluster gap="md" align="center">
            <app-job-chip name="morning-briefing" kind="agent" state="active" size="sm" />
            <app-job-chip name="morning-briefing" kind="agent" state="active" size="md" />
            <app-job-chip name="morning-briefing" kind="agent" state="active" size="lg" />
          </app-ui-cluster>
        </div>

        <div>
          <p class="ui-lab__subhead">By state</p>
          <app-ui-cluster gap="md">
            @for (state of states; track state) {
              <app-job-chip [name]="state" [state]="state" kind="agent" [detail]="'2m ago'" />
            }
          </app-ui-cluster>
        </div>

        <div>
          <p class="ui-lab__subhead">By kind</p>
          <app-ui-cluster gap="md">
            @for (kind of kinds; track kind) {
              <app-job-chip [name]="kind" [kind]="kind" state="active" />
            }
          </app-ui-cluster>
        </div>

        <div>
          <p class="ui-lab__subhead">With detail</p>
          <app-ui-cluster gap="md">
            <app-job-chip name="morning-briefing" kind="agent" state="active" detail="0 7 * * *" />
            <app-job-chip name="context_sync" kind="script" state="running" detail="pre-run" />
            <app-job-chip name="fold_dispatch_sweep" kind="fold" state="active" detail="→ /fleet" />
            <app-job-chip name="stale-check" kind="script" state="failing" detail="exit 1" />
            <app-job-chip name="nightly-vacuum" kind="agent" state="paused" detail="disabled" />
          </app-ui-cluster>
        </div>
      </app-ui-stack>
    </app-ui-section>
  `,
})
export class JobChipSection {
  readonly kinds = KINDS;
  readonly states = STATES;
}
