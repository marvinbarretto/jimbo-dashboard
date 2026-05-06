import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { UiTabBar } from '@shared/components/ui-tab-bar/ui-tab-bar';

@Component({
  selector: 'app-tasks-page',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, UiTabBar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tasks">
      <app-ui-tab-bar label="Tasks sections">
        <a routerLink="triage" routerLinkActive="active" class="ui-tab">Triage</a>
        <a routerLink="activity" routerLinkActive="active" class="ui-tab">Activity</a>
        <a routerLink="settings" routerLinkActive="active" class="ui-tab">Settings</a>
      </app-ui-tab-bar>

      <div class="tasks__body">
        <router-outlet />
      </div>
    </div>
  `,
  styles: [`
    .tasks { display: flex; flex-direction: column; min-height: 100%; }
    .tasks__body { flex: 1; }
  `],
})
export class TasksPage {}
