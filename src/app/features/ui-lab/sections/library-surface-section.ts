import { ChangeDetectionStrategy, Component } from '@angular/core';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { UiButton } from '@shared/components/ui-button/ui-button';
import { UiMetaList } from '@shared/components/ui-meta-list/ui-meta-list';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiCluster } from '@shared/components/ui-cluster/ui-cluster';
import { UiSection } from '@shared/components/ui-section/ui-section';

@Component({
  selector: 'app-library-surface-section',
  imports: [UiBadge, UiButton, UiMetaList, UiStack, UiCluster, UiSection],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-ui-section title="Library Surface" [collapsible]="false">
      <app-ui-stack gap="md">
        <app-ui-cluster gap="sm">
          <app-ui-badge tone="success">success</app-ui-badge>
          <app-ui-badge tone="warning">warning</app-ui-badge>
          <app-ui-badge tone="danger">danger</app-ui-badge>
          <app-ui-badge tone="info">info</app-ui-badge>
          <app-ui-badge tone="neutral" [subtle]="true">subtle</app-ui-badge>
        </app-ui-cluster>

        <app-ui-cluster gap="sm">
          <app-ui-button variant="primary">Primary</app-ui-button>
          <app-ui-button variant="secondary">Secondary</app-ui-button>
          <app-ui-button variant="ghost">Ghost</app-ui-button>
          <app-ui-button variant="danger">Danger</app-ui-button>
        </app-ui-cluster>

        <app-ui-meta-list>
          <dt>Intent</dt>
          <dd>Reusable layout and state primitives with theme inheritance layered on later.</dd>
          <dt>Focus</dt>
          <dd>Consistent page structure, information parsing, and keyboard-accessible workflows.</dd>
          <dt>Next phase</dt>
          <dd>Apply a neon theme over stable semantic components instead of styling one-off pages.</dd>
        </app-ui-meta-list>
      </app-ui-stack>
    </app-ui-section>
  `,
})
export class LibrarySurfaceSection {}
