import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { UiTabBar } from '@shared/components/ui-tab-bar/ui-tab-bar';
import { DATA_PAGES } from '../../data-pages';

/**
 * Tier-3 shell for the raw endpoint inspectors. Previously each of these was
 * mounted at the app root (`/mail`, `/ops`, …), squatting on prime namespaces
 * and reachable only by typing the URL; they now live under `/api` behind one
 * System tab.
 */
@Component({
  selector: 'app-api-data-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, UiTabBar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="api-shell">
      <app-ui-tab-bar label="API domains">
        @for (page of pages; track page.key) {
          <a [routerLink]="page.key" routerLinkActive="active" class="ui-tab">{{ page.title }}</a>
        }
      </app-ui-tab-bar>

      <router-outlet />
    </div>
  `,
  styles: [`
    .api-shell { display: flex; flex-direction: column; min-height: 100%; }
  `],
})
export class ApiDataShell {
  protected readonly pages = DATA_PAGES;
}
