import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { UiToggle } from '@shared/components/ui-toggle/ui-toggle';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiCluster } from '@shared/components/ui-cluster/ui-cluster';
import { UiSection } from '@shared/components/ui-section/ui-section';

@Component({
  selector: 'app-toggle-section',
  imports: [UiToggle, UiStack, UiCluster, UiSection],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../lab-utils.scss'],
  template: `
    <app-ui-section title="Toggle" [collapsible]="false">
      <app-ui-stack gap="md">
        <p class="ui-lab__support-copy">
          Slide toggle for boolean settings. Uses <code>role="switch"</code> and
          <code>aria-checked</code>. OFF state is <code>--color-danger</code> (red);
          ON state is <code>--color-success</code> (green). Inputs: <code>checked</code>,
          <code>label</code>, <code>disabled</code>. Output: <code>changed</code> emits the
          new boolean.
        </p>

        <div>
          <p class="ui-lab__subhead">States</p>
          <app-ui-cluster gap="lg" align="center">
            <app-ui-toggle [checked]="false" label="Off example" />
            <app-ui-toggle [checked]="true" label="On example" />
            <app-ui-toggle [checked]="false" [disabled]="true" label="Disabled off" />
            <app-ui-toggle [checked]="true" [disabled]="true" label="Disabled on" />
          </app-ui-cluster>
        </div>

        <div>
          <p class="ui-lab__subhead">Interactive</p>
          <app-ui-cluster gap="md" align="center">
            <app-ui-toggle
              [checked]="labToggle()"
              label="Interactive toggle"
              (changed)="labToggle.set($event)"
            />
            <span class="ui-lab__support-copy">Value: {{ labToggle() ? 'on' : 'off' }}</span>
          </app-ui-cluster>
        </div>
      </app-ui-stack>
    </app-ui-section>
  `,
})
export class ToggleSection {
  protected readonly labToggle = signal(false);
}
