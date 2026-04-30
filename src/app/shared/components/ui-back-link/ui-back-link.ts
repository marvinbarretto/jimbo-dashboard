import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-ui-back-link',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a [routerLink]="to()" class="ui-back-link">
      <ng-content />
    </a>
  `,
  styles: [`
    .ui-back-link {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      width: fit-content;
      font-size: 0.82rem;
      color: var(--color-text-muted);
      text-decoration: none;
    }

    .ui-back-link:hover {
      color: var(--color-text);
      text-decoration: none;
    }
  `],
})
export class UiBackLink {
  readonly to = input.required<string | readonly (string | number)[]>();
}
