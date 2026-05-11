import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { AppIcon } from '@shared/components/app-icon/app-icon';
import { UiButton } from '@shared/components/ui-button/ui-button';
import { UiButtonLink } from '@shared/components/ui-button-link/ui-button-link';
import { UiCluster } from '@shared/components/ui-cluster/ui-cluster';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';

@Component({
  selector: 'app-ui-button-section',
  imports: [AppIcon, UiButton, UiButtonLink, UiCluster, UiSection, UiStack],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../lab-utils.scss'],
  template: `
    <app-ui-section title="Button" [collapsible]="false">
      <app-ui-stack gap="md">
        <p class="ui-lab__support-copy">
          Two siblings sharing one visual contract:
          <code>&lt;app-ui-button&gt;</code> renders <code>&lt;button&gt;</code> for
          actions (<code>(pressed)</code> output);
          <code>&lt;app-ui-button-link&gt;</code> renders <code>&lt;a routerLink&gt;</code>
          for navigation. Identical variants
          (<code>primary</code> / <code>secondary</code> / <code>ghost</code> /
          <code>danger</code>), sizes (<code>md</code> / <code>sm</code>), and
          <code>[iconOnly]</code> for square icon buttons at the same height as
          text buttons of the same size.
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
          <p class="ui-lab__subhead">Icon-only · square at every size</p>
          <app-ui-cluster gap="sm" align="center">
            <app-ui-button variant="primary"   [iconOnly]="true" ariaLabel="Edit"><app-icon name="edit" /></app-ui-button>
            <app-ui-button variant="secondary" [iconOnly]="true" ariaLabel="Edit"><app-icon name="edit" /></app-ui-button>
            <app-ui-button variant="ghost"     [iconOnly]="true" ariaLabel="Edit"><app-icon name="edit" /></app-ui-button>
            <app-ui-button variant="danger"    [iconOnly]="true" ariaLabel="Delete"><app-icon name="delete" /></app-ui-button>
            <span class="ui-lab__support-copy">md size — height matches text buttons above</span>
          </app-ui-cluster>
          <app-ui-cluster gap="sm" align="center" style="margin-top: 0.5rem;">
            <app-ui-button variant="primary"   size="sm" [iconOnly]="true" ariaLabel="Edit"><app-icon name="edit" [size]="14" /></app-ui-button>
            <app-ui-button variant="secondary" size="sm" [iconOnly]="true" ariaLabel="Edit"><app-icon name="edit" [size]="14" /></app-ui-button>
            <app-ui-button variant="ghost"     size="sm" [iconOnly]="true" ariaLabel="Edit"><app-icon name="edit" [size]="14" /></app-ui-button>
            <app-ui-button variant="danger"    size="sm" [iconOnly]="true" ariaLabel="Delete"><app-icon name="delete" [size]="14" /></app-ui-button>
            <span class="ui-lab__support-copy">sm size</span>
          </app-ui-cluster>
        </div>

        <div>
          <p class="ui-lab__subhead">Anchor sibling — UiButtonLink</p>
          <app-ui-cluster gap="sm" align="center">
            <app-ui-button-link variant="primary" [routerLink]="['/today']">Today</app-ui-button-link>
            <app-ui-button-link variant="ghost" [routerLink]="['/ui-lab']">UI Lab</app-ui-button-link>
            <app-ui-button-link variant="ghost" size="sm" [iconOnly]="true" ariaLabel="Edit" [routerLink]="['/today']">
              <app-icon name="edit" [size]="14" />
            </app-ui-button-link>
          </app-ui-cluster>
          <p class="ui-lab__support-copy" style="margin-top: 0.5rem;">
            Identical visuals to the buttons above — same SCSS file backs both components.
          </p>
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
