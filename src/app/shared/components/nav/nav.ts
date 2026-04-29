import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import pkg from '../../../../../package.json';

interface NavItem {
  readonly href: string;
  readonly label: string;
}

@Component({
  selector: 'app-nav',
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav aria-label="Primary" class="app-nav">
      <a class="app-nav__brand" routerLink="/today">
        <span class="app-nav__logo">jimbo</span>
        <span class="app-nav__version">v{{ version }}</span>
      </a>

      <ul class="app-nav__list">
        @for (item of navItems; track item.href) {
          <li class="app-nav__item">
            <a
              [routerLink]="item.href"
              routerLinkActive="active"
              class="app-nav__link">
              {{ item.label }}
            </a>
          </li>
        }
      </ul>
    </nav>
  `,
  styles: [`
    .app-nav {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.9rem 0 0.75rem;
      min-width: 0;
    }

    .app-nav__brand {
      display: inline-flex;
      align-items: baseline;
      gap: 0.45rem;
      flex-shrink: 0;
      text-decoration: none;
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
      letter-spacing: 0;
    }

    .app-nav__list {
      list-style: none;
      display: flex;
      flex: 1;
      flex-wrap: wrap;
      gap: 0.45rem;
      min-width: 0;
      margin: 0;
      padding: 0;
    }

    .app-nav__item {
      display: flex;
    }

    .app-nav__link {
      display: inline-flex;
      align-items: center;
      min-height: 2.2rem;
      padding: 0.35rem 0.75rem;
      border: 1px solid transparent;
      border-radius: 999px;
      font-size: 0.85rem;
      font-weight: 500;
      color: var(--color-text-muted);
      text-decoration: none;
      white-space: nowrap;
      transition:
        color 120ms ease,
        border-color 120ms ease,
        background-color 120ms ease;
    }

    .app-nav__brand:focus-visible,
    .app-nav__link:focus-visible {
      outline: 2px solid var(--color-accent);
      outline-offset: 2px;
    }

    .app-nav__link:hover {
      color: var(--color-text);
      border-color: color-mix(in srgb, var(--color-border) 90%, transparent);
      background: color-mix(in srgb, var(--color-surface) 75%, transparent);
    }

    .app-nav__link.active {
      color: var(--color-text);
      border-color: color-mix(in srgb, var(--color-accent) 38%, var(--color-border));
      background: color-mix(in srgb, var(--color-accent) 10%, var(--color-surface));
    }

    @media (max-width: 768px) {
      .app-nav {
        flex-direction: column;
        align-items: stretch;
        gap: 0.7rem;
      }

      .app-nav__list {
        flex-wrap: nowrap;
        overflow-x: auto;
        padding-bottom: 0.2rem;
        scrollbar-width: thin;
      }
    }
  `],
})
export class Nav {
  readonly version = pkg.version;
  protected readonly navItems: readonly NavItem[] = [
    { href: '/today', label: 'Today' },
    { href: '/mail', label: 'Mail' },
    { href: '/calendar', label: 'Calendar' },
    { href: '/tasks', label: 'Tasks' },
    { href: '/ops', label: 'Ops' },
    { href: '/briefings', label: 'Briefings' },
    { href: '/vault-items', label: 'Vault' },
    { href: '/grooming', label: 'Grooming' },
    { href: '/questions', label: 'Questions' },
    { href: '/grooming-admin', label: 'Grooming API' },
    { href: '/execution', label: 'Execution' },
    { href: '/triage', label: 'Triage' },
    { href: '/interrogate', label: 'Interrogate' },
    { href: '/context', label: 'Context' },
    { href: '/coach', label: 'Coach' },
    { href: '/activity', label: 'Activity' },
    { href: '/projects', label: 'Projects' },
    { href: '/actors', label: 'Actors' },
    { href: '/skills', label: 'Skills' },
    { href: '/models', label: 'Models' },
    { href: '/model-stacks', label: 'Stacks' },
    { href: '/coverage', label: 'Coverage' },
  ];
}
