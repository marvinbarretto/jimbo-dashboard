import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { UiTabBar } from '@shared/components/ui-tab-bar/ui-tab-bar';
import { NavState } from './nav-state.service';

/**
 * Tier-2 nav: the active section's tabs. Rendered once by the app shell rather
 * than by each feature, so a section's tab bar survives navigation between its
 * own pages without every feature needing a shell component of its own.
 *
 * Renders nothing on routes that belong to no section (auth, bare deep links).
 */
@Component({
  selector: 'app-section-tabs',
  imports: [RouterLink, RouterLinkActive, UiTabBar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (nav.activeSection(); as section) {
      <app-ui-tab-bar [label]="section.label + ' sections'">
        @for (tab of section.tabs; track tab.href) {
          <a [routerLink]="tab.href" routerLinkActive="active" class="ui-tab">{{ tab.label }}</a>
        }
      </app-ui-tab-bar>
    }
  `,
})
export class SectionTabs {
  protected readonly nav = inject(NavState);
}
