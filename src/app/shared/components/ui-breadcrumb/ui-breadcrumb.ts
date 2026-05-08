import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface Crumb {
  readonly label: string;
  readonly link?: string | readonly (string | number)[];
}

@Component({
  selector: 'app-ui-breadcrumb',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="ui-breadcrumb" aria-label="Breadcrumb">
      @for (crumb of crumbs(); track $index; let last = $last) {
        @if (crumb.link && !last) {
          <a [routerLink]="crumb.link" class="ui-breadcrumb__link">{{ crumb.label }}</a>
        } @else {
          <span class="ui-breadcrumb__current" [attr.aria-current]="last ? 'page' : null">
            {{ crumb.label }}
          </span>
        }
        @if (!last) {
          <span class="ui-breadcrumb__sep" aria-hidden="true">/</span>
        }
      }
    </nav>
  `,
  styles: [`
    .ui-breadcrumb {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      font-size: 0.8rem;
      color: var(--color-text-soft);
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .ui-breadcrumb__link {
      color: var(--color-text-soft);
      text-decoration: none;
      padding: 0.1rem 0.2rem;
      border: 1px solid transparent;
      border-radius: var(--radius-sm, 3px);
    }

    .ui-breadcrumb__link:hover {
      color: var(--color-text);
      border-color: var(--color-border-strong);
    }

    .ui-breadcrumb__link:focus-visible {
      outline: none;
      box-shadow: var(--focus-ring);
    }

    .ui-breadcrumb__current {
      color: var(--color-text-muted);
    }

    .ui-breadcrumb__sep {
      color: var(--color-border-strong);
      user-select: none;
    }
  `],
})
export class UiBreadcrumb {
  readonly crumbs = input.required<readonly Crumb[]>();
}
