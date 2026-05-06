import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UiBackLink } from '@shared/components/ui-back-link/ui-back-link';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { UiCluster } from '@shared/components/ui-cluster/ui-cluster';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiMetaList } from '@shared/components/ui-meta-list/ui-meta-list';
import { UiPageHeader } from '@shared/components/ui-page-header/ui-page-header';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';

@Component({
  selector: 'app-detail-workflow-section',
  imports: [RouterLink, UiBackLink, UiBadge, UiCluster, UiEmptyState, UiMetaList, UiPageHeader, UiSection, UiStack],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-ui-section title="Typical Detail Workflow" [collapsible]="false">
      <app-ui-stack gap="md">
        <app-ui-page-header>
          <app-ui-back-link uiPageHeaderLead [to]="['/config/projects']">← Projects</app-ui-back-link>
          <h2 uiPageHeaderTitle>Hermes</h2>
          <p uiPageHeaderHint>Inspect core metadata, check recent activity, and choose between inline edits or advanced edit.</p>
          <app-ui-cluster uiPageHeaderActions gap="sm">
            <app-ui-badge tone="success">active</app-ui-badge>
            <a routerLink="/config/projects/hermes/edit" class="btn btn--secondary">Advanced edit</a>
          </app-ui-cluster>
        </app-ui-page-header>

        <app-ui-meta-list>
          <dt>ID</dt>
          <dd><code>hermes</code></dd>
          <dt>Owner</dt>
          <dd>@marvin</dd>
          <dt>Criteria</dt>
          <dd>Keep the operator-facing workflow fast, explicit, and easy to debug.</dd>
        </app-ui-meta-list>

        <app-ui-empty-state message="No project activity yet." />
      </app-ui-stack>
    </app-ui-section>
  `,
})
export class DetailWorkflowSection {}
