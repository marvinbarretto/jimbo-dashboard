import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { UiTabBar } from '@shared/components/ui-tab-bar/ui-tab-bar';

@Component({
  selector: 'app-config-page',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, UiTabBar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="config">
      <app-ui-tab-bar label="Config sections">
        <a routerLink="projects" routerLinkActive="active" class="ui-tab">Projects</a>
        <a routerLink="actors" routerLinkActive="active" class="ui-tab">Actors</a>
        <a routerLink="skills" routerLinkActive="active" class="ui-tab">Skills</a>
      </app-ui-tab-bar>

      <div class="config__body">
        <router-outlet />
      </div>
    </div>
  `,
  styles: [`
    .config { display: flex; flex-direction: column; min-height: 100%; }
    .config__body { flex: 1; }
  `],
})
export class ConfigPage {}
