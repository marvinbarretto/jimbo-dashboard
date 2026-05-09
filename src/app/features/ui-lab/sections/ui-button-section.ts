import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { UiButton } from '@shared/components/ui-button/ui-button';
import { UiCluster } from '@shared/components/ui-cluster/ui-cluster';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';

@Component({
  selector: 'app-ui-button-section',
  imports: [UiButton, UiCluster, UiSection, UiStack],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../lab-utils.scss'],
  template: `
    <app-ui-section title="Button" [collapsible]="false">
      <app-ui-stack gap="md">
        <p class="ui-lab__support-copy">
          Standard button primitive. Variants: <code>primary</code>,
          <code>secondary</code> (default), <code>ghost</code>, <code>danger</code>.
          Sizes: <code>md</code> (default), <code>sm</code>. Inputs: <code>variant</code>,
          <code>size</code>, <code>type</code>, <code>disabled</code>, <code>ariaLabel</code>.
          Output: <code>pressed</code>.
        </p>

        <div>
          <p class="ui-lab__subhead">Variants</p>
          <app-ui-cluster gap="sm" align="center">
            <app-ui-button variant="primary">Primary</app-ui-button>
            <app-ui-button variant="secondary">Secondary</app-ui-button>
            <app-ui-button variant="ghost">Ghost</app-ui-button>
            <app-ui-button variant="danger">Danger</app-ui-button>
          </app-ui-cluster>
        </div>

        <div>
          <p class="ui-lab__subhead">Sizes</p>
          <app-ui-cluster gap="sm" align="center">
            <app-ui-button variant="primary" size="md">Medium</app-ui-button>
            <app-ui-button variant="primary" size="sm">Small</app-ui-button>
          </app-ui-cluster>
        </div>

        <div>
          <p class="ui-lab__subhead">Disabled</p>
          <app-ui-cluster gap="sm" align="center">
            <app-ui-button variant="primary" [disabled]="true">Primary</app-ui-button>
            <app-ui-button variant="secondary" [disabled]="true">Secondary</app-ui-button>
            <app-ui-button variant="ghost" [disabled]="true">Ghost</app-ui-button>
            <app-ui-button variant="danger" [disabled]="true">Danger</app-ui-button>
          </app-ui-cluster>
        </div>

        <div>
          <p class="ui-lab__subhead">Interactive</p>
          <app-ui-cluster gap="md" align="center">
            <app-ui-button variant="primary" (pressed)="onPressed()">Click me</app-ui-button>
            <span class="ui-lab__support-copy">Pressed: <code>{{ pressCount() }}</code></span>
          </app-ui-cluster>
        </div>
      </app-ui-stack>
    </app-ui-section>
  `,
})
export class UiButtonSection {
  protected readonly pressCount = signal(0);
  protected onPressed(): void { this.pressCount.update(n => n + 1); }
}
