import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { UiMetaList } from '@shared/components/ui-meta-list/ui-meta-list';
import { UiPageHeader } from '@shared/components/ui-page-header/ui-page-header';
import { UiRefreshControl } from '@shared/components/ui-refresh-control/ui-refresh-control';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';

@Component({
  selector: 'app-refresh-control-section',
  imports: [UiMetaList, UiPageHeader, UiRefreshControl, UiSection, UiStack],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-ui-section title="Refresh Control" [collapsible]="false">
      <app-ui-stack gap="lg">
        <app-ui-page-header>
          <h2 uiPageHeaderTitle>Refresh Control</h2>
          <p uiPageHeaderHint>
            Compact freshness timestamp + reload button for activity-style pages backed by a
            polling service. Pair it with a count badge inside an <code>app-ui-cluster</code>
            in the page header actions slot.
          </p>
        </app-ui-page-header>

        <app-ui-meta-list>
          <dt>loading</dt>
          <dd>boolean — disables the button and replaces the icon with <code>…</code></dd>
          <dt>lastFetch</dt>
          <dd>ISO string or null — when present, renders "updated 2m ago" via the relativeTime pipe</dd>
          <dt>label</dt>
          <dd>string — defaults to <code>refresh</code></dd>
          <dt>(refresh)</dt>
          <dd>output — fires when the user presses the button</dd>
        </app-ui-meta-list>

        <app-ui-stack gap="md">
          <div>
            <p class="ui-lab__support-copy">Idle</p>
            <app-ui-refresh-control
              [loading]="false"
              [lastFetch]="recentIso()"
              (refresh)="bumpFetch()"
            />
          </div>

          <div>
            <p class="ui-lab__support-copy">Loading</p>
            <app-ui-refresh-control
              [loading]="true"
              [lastFetch]="recentIso()"
            />
          </div>

          <div>
            <p class="ui-lab__support-copy">Never fetched</p>
            <app-ui-refresh-control
              [loading]="false"
              [lastFetch]="null"
              (refresh)="bumpFetch()"
            />
          </div>
        </app-ui-stack>
      </app-ui-stack>
    </app-ui-section>
  `,
  styleUrls: ['../lab-utils.scss'],
})
export class RefreshControlSection {
  protected readonly recentIso = signal(new Date(Date.now() - 2 * 60_000).toISOString());

  protected bumpFetch(): void {
    this.recentIso.set(new Date().toISOString());
  }
}
