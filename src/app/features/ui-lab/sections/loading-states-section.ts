import { ChangeDetectionStrategy, Component } from '@angular/core';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';

@Component({
  selector: 'app-loading-states-section',
  imports: [UiLoadingState, UiSection, UiStack],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-ui-section title="Loading States" [collapsible]="false">
      <app-ui-stack gap="sm">
        <app-ui-loading-state label="Loading skills" message="Fetching skill registry." />
        <app-ui-loading-state label="Loading project activity" message="Refreshing recent activity." />
      </app-ui-stack>
    </app-ui-section>
  `,
})
export class LoadingStatesSection {}
