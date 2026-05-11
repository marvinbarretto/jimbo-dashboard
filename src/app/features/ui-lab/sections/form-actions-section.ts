import { ChangeDetectionStrategy, Component } from '@angular/core';
import { UiButton } from '@shared/components/ui-button/ui-button';
import { UiButtonLink } from '@shared/components/ui-button-link/ui-button-link';
import { UiCluster } from '@shared/components/ui-cluster/ui-cluster';
import { UiFormActions } from '@shared/components/ui-form-actions/ui-form-actions';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';

@Component({
  selector: 'app-form-actions-section',
  imports: [UiButton, UiButtonLink, UiCluster, UiFormActions, UiSection, UiStack],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../lab-utils.scss'],
  template: `
    <app-ui-section title="Form Actions" [collapsible]="false">
      <app-ui-stack gap="md">
        <p class="ui-lab__support-copy">Typical bottom-of-form action rows with different emphases.</p>

        <app-ui-form-actions>
          <app-ui-button-link variant="ghost" routerLink="/config/projects">Cancel</app-ui-button-link>
          <app-ui-button variant="primary">Save changes</app-ui-button>
        </app-ui-form-actions>

        <app-ui-form-actions align="between">
          <app-ui-button variant="danger">Delete</app-ui-button>
          <app-ui-cluster gap="sm">
            <app-ui-button-link variant="ghost" routerLink="/config/skills">Cancel</app-ui-button-link>
            <app-ui-button variant="primary">Create</app-ui-button>
          </app-ui-cluster>
        </app-ui-form-actions>
      </app-ui-stack>
    </app-ui-section>
  `,
})
export class FormActionsSection {}
