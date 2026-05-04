import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import pkg from '../../../../../package.json';
import { navGroups, primaryNavItems, type NavGroup } from './nav-config';

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
          <li class="app-nav__item">
            <a
              [routerLink]="item.href"
              routerLinkActive="active"
              class="app-nav__link app-nav__link--primary">
              {{ item.label }}
            </a>
          </li>
        }

        @for (group of groups; track group.id) {
          <li class="app-nav__item app-nav__item--archive">
            <a
              [routerLink]="group.items[0].href"
              [class.active]="activeGroupId() === group.id"
              class="app-nav__link app-nav__link--archive">
              {{ group.label }}
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
      align-items: center;
      gap: 0.45rem;
      margin: 0;
      padding: 0;
      min-width: 0;
    }

    .app-nav__item {
      display: flex;
    }

    /* push Archive to the far right */
    .app-nav__item--archive {
      margin-left: auto;
    }

    .app-nav__link {
      display: inline-flex;
      align-items: center;
      min-height: 2.2rem;
      padding: 0.35rem 0.85rem;
      border: 1px solid transparent;
      border-radius: 999px;
      font-size: 0.85rem;
      font-weight: 500;
      text-decoration: none;
      white-space: nowrap;
      transition:
        color 120ms ease,
        border-color 120ms ease,
        background-color 120ms ease;
    }

    /* UI Lab — prominent */
    .app-nav__link--primary {
      color: var(--color-text);
      border-color: var(--color-border);
      background: color-mix(in srgb, var(--color-surface) 60%, transparent);
    }

    .app-nav__link--primary:hover {
      border-color: color-mix(in srgb, var(--color-accent) 50%, var(--color-border));
      background: color-mix(in srgb, var(--color-accent) 8%, var(--color-surface));
    }

    .app-nav__link--primary.active {
      color: var(--color-text);
      border-color: color-mix(in srgb, var(--color-accent) 60%, var(--color-border));
      background: color-mix(in srgb, var(--color-accent) 12%, var(--color-surface));
    }

    /* Archive — quiet, secondary */
    .app-nav__link--archive {
      font-size: 0.78rem;
      color: var(--color-text-muted);
      opacity: 0.6;
    }

    .app-nav__link--archive:hover {
      color: var(--color-text-muted);
      border-color: color-mix(in srgb, var(--color-border) 70%, transparent);
      opacity: 0.9;
    }

    .app-nav__link--archive.active {
      color: var(--color-text-muted);
      border-color: color-mix(in srgb, var(--color-border) 80%, transparent);
      opacity: 1;
    }

    .app-nav__brand:focus-visible,
    .app-nav__link:focus-visible {
      outline: 2px solid var(--color-accent);
      outline-offset: 2px;
    }

    @media (max-width: 768px) {
      .app-nav {
        flex-direction: column;
        align-items: stretch;
        gap: 0.7rem;
      }

      .app-nav__item--archive {
        margin-left: 0;
      }

      .app-nav__list {
        overflow-x: auto;
        padding-bottom: 0.2rem;
        scrollbar-width: thin;
      }
    }
  `],
})
export class Nav {
  readonly version = pkg.version;
  protected readonly primaryItems = primaryNavItems;
  protected readonly groups: readonly NavGroup[] = navGroups;

  private readonly router = inject(Router);
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(e => (e as NavigationEnd).urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  protected readonly activeGroupId = computed(() => {
    const segment = (this.currentUrl() ?? '').split('/')[1];
    return navGroups.find(g => g.paths.includes(segment))?.id ?? null;
  });
}
