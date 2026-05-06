import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { UiMetaList } from '@shared/components/ui-meta-list/ui-meta-list';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiTabBar } from '@shared/components/ui-tab-bar/ui-tab-bar';

@Component({
  selector: 'app-tab-bar-section',
  imports: [UiMetaList, UiSection, UiStack, UiTabBar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../lab-utils.scss'],
  template: `
    <app-ui-section title="Tab Bar" [collapsible]="false">
      <app-ui-stack gap="md">
        <app-ui-meta-list>
          <dt>Component</dt>
          <dd><code>app-ui-tab-bar</code> — wraps a <code>nav</code> with the underline-tab border. Tabs are projected as <code>.ui-tab</code> elements (links or buttons).</dd>
          <dt>Active state</dt>
          <dd>Router tabs: <code>routerLinkActive="active"</code>. Signal tabs: <code>[class.active]="activeTab() === 'x'"</code>.</dd>
        </app-ui-meta-list>

        <div>
          <p class="ui-lab__subhead">Router-style (static demo)</p>
          <app-ui-tab-bar label="Demo navigation">
            <a class="ui-tab active" href="#" (click)="$event.preventDefault()">Overview</a>
            <a class="ui-tab" href="#" (click)="$event.preventDefault()">Detail</a>
            <a class="ui-tab" href="#" (click)="$event.preventDefault()">Settings</a>
          </app-ui-tab-bar>
        </div>

        <div>
          <p class="ui-lab__subhead">Signal-based (functional)</p>
          <app-ui-tab-bar label="Signal tab demo">
            <button type="button" class="ui-tab" [class.active]="labActiveTab() === 'overview'" (click)="labActiveTab.set('overview')">Overview</button>
            <button type="button" class="ui-tab" [class.active]="labActiveTab() === 'detail'" (click)="labActiveTab.set('detail')">Detail</button>
            <button type="button" class="ui-tab" [class.active]="labActiveTab() === 'settings'" (click)="labActiveTab.set('settings')">Settings</button>
          </app-ui-tab-bar>
          <div class="ui-lab__tab-content">
            @switch (labActiveTab()) {
              @case ('overview') { <p>Overview content — project list, summary stats.</p> }
              @case ('detail') { <p>Detail content — expanded fields, related items.</p> }
              @case ('settings') { <p>Settings content — configuration, permissions.</p> }
            }
          </div>
        </div>
      </app-ui-stack>
    </app-ui-section>
  `,
})
export class TabBarSection {
  protected readonly labActiveTab = signal<'overview' | 'detail' | 'settings'>('overview');
}
