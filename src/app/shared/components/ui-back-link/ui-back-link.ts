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
      min-height: 2rem;
      padding: 0.1rem 0.35rem;
      border: 1px solid transparent;
      font-size: 0.8rem;
      color: var(--color-text-soft);
      letter-spacing: 0.05em;
      text-transform: uppercase;
      text-decoration: none;
    }

    .ui-back-link:hover {
      border-color: var(--color-border-strong);
      color: var(--color-text);
      text-decoration: none;
    }

    .ui-back-link:focus-visible {
      outline: none;
      box-shadow: var(--focus-ring);
    }
  `],
})
export class UiBackLink {
  readonly to = input.required<string | readonly (string | number)[]>();
}
