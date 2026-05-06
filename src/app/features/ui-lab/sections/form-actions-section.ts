import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UiButton } from '@shared/components/ui-button/ui-button';
import { UiCluster } from '@shared/components/ui-cluster/ui-cluster';
import { UiFormActions } from '@shared/components/ui-form-actions/ui-form-actions';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';

@Component({
  selector: 'app-form-actions-section',
  imports: [RouterLink, UiButton, UiCluster, UiFormActions, UiSection, UiStack],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../lab-utils.scss'],
  template: `
    <app-ui-section title="Form Actions" [collapsible]="false">
      <app-ui-stack gap="md">
        <p class="ui-lab__support-copy">Typical bottom-of-form action rows with different emphases.</p>

        <app-ui-form-actions>
          <a routerLink="/config/projects" class="btn btn--ghost">Cancel</a>
          <app-ui-button variant="primary">Save changes</app-ui-button>
        </app-ui-form-actions>

        <app-ui-form-actions align="between">
          <app-ui-button variant="danger">Delete</app-ui-button>
          <app-ui-cluster gap="sm">
            <a routerLink="/skills" class="btn btn--ghost">Cancel</a>
            <app-ui-button variant="primary">Create</app-ui-button>
          </app-ui-cluster>
        </app-ui-form-actions>
      </app-ui-stack>
    </app-ui-section>
  `,
})
export class FormActionsSection {}
