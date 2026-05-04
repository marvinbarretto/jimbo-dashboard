import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import pkg from '../../../../../package.json';
import { primaryNavItems } from './nav-config';

@Component({
  selector: 'app-nav',
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav aria-label="Primary" class="app-nav">
      <a class="app-nav__brand" routerLink="/ui-lab">
        <span class="app-nav__logo">jimbo</span>
        <span class="app-nav__version">v{{ version }}</span>
      </a>

      <ul class="app-nav__list">
        @for (item of primaryItems; track item.href) {
          <li class="app-nav__item" [style.--nav-accent]="item.accent">
            <a
              [routerLink]="item.href"
              routerLinkActive="active"
              class="app-nav__link">
              {{ item.label }}
            </a>
          </li>
        }

        <li class="app-nav__item app-nav__item--search">
          <input
            type="search"
            class="app-nav__search"
            placeholder="Search…"
            aria-label="Global search"
            disabled
          />
        </li>
      </ul>
    </nav>
  `,
  styles: [`
    .app-nav {
      display: flex;
      align-items: stretch;
      min-width: 0;
    }

    .app-nav__brand {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      flex-shrink: 0;
      padding: 0 1.5rem 0 0;
      margin-right: 0.5rem;
      text-decoration: none;
      border-right: 1px solid var(--color-border);
    }

    .app-nav__logo {
      font-weight: 700;
      font-size: 1rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--color-accent);
    }

    .app-nav__version {
      font-size: 0.72rem;
      font-weight: 500;
      color: var(--color-text-muted);
    }

    .app-nav__list {
      list-style: none;
      display: flex;
      flex: 1;
      align-items: stretch;
      margin: 0;
      padding: 0;
      min-width: 0;
    }

    .app-nav__item {
      display: flex;
      flex: 1;
    }

    .app-nav__item--search {
      flex: 0 0 auto;
      align-items: center;
      margin-left: auto;
      padding: 0 0 0 1rem;
    }

    .app-nav__link {
      display: flex;
      width: 100%;
      align-items: center;
      justify-content: center;
      padding: 0.9rem 1rem;
      font-size: 0.875rem;
      font-weight: 500;
      text-decoration: none;
      white-space: nowrap;
      color: var(--color-text-muted);
      border-bottom: 3px solid transparent;
      transition: color 120ms ease, border-bottom-color 120ms ease;
    }

    .app-nav__link:hover {
      color: var(--nav-accent, var(--color-accent));
    }

    .app-nav__link.active {
      color: var(--nav-accent, var(--color-accent));
      border-bottom-color: var(--nav-accent, var(--color-accent));
    }

    .app-nav__search {
      height: 1.75rem;
      padding: 0 0.6rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      background: var(--color-surface-soft, var(--color-surface));
      color: var(--color-text-muted);
      font: inherit;
      font-size: 0.8rem;
      width: 9rem;
      transition: border-color 120ms ease;

      &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
    }

    .app-nav__brand:focus-visible,
    .app-nav__link:focus-visible {
      outline: 2px solid var(--color-accent);
      outline-offset: -2px;
    }

    @media (max-width: 768px) {
      .app-nav {
        flex-direction: column;
        align-items: stretch;
      }

      .app-nav__list {
        overflow-x: auto;
        padding-bottom: 0.2rem;
        scrollbar-width: thin;
      }

      .app-nav__item {
        flex: 0 0 auto;
      }

      .app-nav__item--search {
        display: none;
      }
    }
  `],
})
export class Nav {
  readonly version = pkg.version;
  protected readonly primaryItems = primaryNavItems;
}
