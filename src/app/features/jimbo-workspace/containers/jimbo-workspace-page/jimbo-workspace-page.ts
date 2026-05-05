import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { UiTabBar } from '@shared/components/ui-tab-bar/ui-tab-bar';

@Component({
  selector: 'app-jimbo-workspace-page',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, UiTabBar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="jw">
      <header class="jw__header">
        <h1 class="jw__title">Jimbo Workspace</h1>
        <p class="jw__subtitle">marvinbarretto.labs&#64;gmail.com — read-only API dump</p>
      </header>

      <app-ui-tab-bar label="Workspace views">
        <a routerLink="mail" routerLinkActive="active" class="ui-tab">Mail</a>
        <a routerLink="calendar" routerLinkActive="active" class="ui-tab">Calendar</a>
        <a routerLink="tasks" routerLinkActive="active" class="ui-tab">Tasks</a>
      </app-ui-tab-bar>

      <div class="jw__body">
        <router-outlet />
      </div>
    </div>
  `,
  styles: [`
    .jw { display: flex; flex-direction: column; min-height: 100%; }
    .jw__header { padding: 1.5rem 1.5rem 1rem; }
    .jw__title {
      margin: 0 0 0.25rem;
      font-size: 1.25rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    .jw__subtitle {
      margin: 0;
      font-size: 0.8rem;
      color: var(--color-text-muted);
    }
    .jw__body { flex: 1; padding: 1.5rem; }
  `],
})
export class JimboWorkspacePage {}
