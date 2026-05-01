import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-ui-tab-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="ui-tab-bar" [attr.aria-label]="label()">
      <ng-content />
    </nav>
  `,
  styles: [`
    :host { display: block; }

    .ui-tab-bar {
      display: flex;
      border-bottom: 1px solid var(--color-border);
    }
  `],
})
export class UiTabBar {
  readonly label = input('Navigation');
}
