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
      <a class="app-nav__brand" routerLink="/today">
        <span class="app-nav__logo">jimbo</span>
        <span class="app-nav__version">v{{ version }}</span>
      </a>

      <ul class="app-nav__list">
        @for (item of primaryItems; track item.href) {
          <li class="app-nav__item">
            <a
              [routerLink]="item.href"
              routerLinkActive="active"
              class="app-nav__link">
              {{ item.label }}
            </a>
          </li>
        }

        @for (group of groups; track group.id) {
          <li class="app-nav__item">
            <a
              [routerLink]="group.items[0].href"
              [class.active]="activeGroupId() === group.id"
              class="app-nav__link app-nav__link--group">
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

    .app-nav__link--group {
      font-style: italic;
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
