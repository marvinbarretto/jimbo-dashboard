import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { navGroups, type NavGroup } from '../nav/nav-config';

@Component({
  selector: 'app-sub-nav',
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (activeGroup(); as group) {
      <nav [attr.aria-label]="group.label" class="app-sub-nav">
        <span class="app-sub-nav__section">{{ group.label }}</span>
        <ul class="app-sub-nav__list">
          @for (item of group.items; track item.href) {
            <li class="app-sub-nav__item">
              <a
                [routerLink]="item.href"
                routerLinkActive="active"
                class="app-sub-nav__link">
                {{ item.label }}
              </a>
            </li>
          }
        </ul>
      </nav>
    }
  `,
  styles: [`
    .app-sub-nav {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.4rem 0 0.5rem;
      border-top: 1px solid var(--color-border);
      min-width: 0;
    }

    .app-sub-nav__section {
      font-size: 0.72rem;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--color-text-muted);
      flex-shrink: 0;
      opacity: 0.6;
    }

    .app-sub-nav__list {
      list-style: none;
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem;
      margin: 0;
      padding: 0;
      min-width: 0;
    }

    .app-sub-nav__item {
      display: flex;
    }

    .app-sub-nav__link {
      display: inline-flex;
      align-items: center;
      padding: 0.2rem 0.5rem;
      font-size: 0.8rem;
      font-weight: 500;
      color: var(--color-text-muted);
      text-decoration: none;
      white-space: nowrap;
      border-bottom: 2px solid transparent;
      transition: color 120ms ease, border-bottom-color 120ms ease;
    }

    .app-sub-nav__link:hover {
      color: var(--color-text);
    }

    .app-sub-nav__link.active {
      color: var(--color-text);
      border-bottom-color: color-mix(in srgb, var(--color-accent) 60%, var(--color-border));
    }

    .app-sub-nav__link:focus-visible {
      outline: 2px solid var(--color-accent);
      outline-offset: 2px;
    }

    @media (max-width: 768px) {
      .app-sub-nav {
        flex-direction: column;
        align-items: stretch;
        gap: 0.4rem;
      }

      .app-sub-nav__list {
        flex-wrap: nowrap;
        overflow-x: auto;
        padding-bottom: 0.2rem;
        scrollbar-width: thin;
      }
    }
  `],
})
export class SubNav {
  private readonly router = inject(Router);
  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(e => (e as NavigationEnd).urlAfterRedirects),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  protected readonly activeGroup = computed((): NavGroup | null => {
    const segment = (this.currentUrl() ?? '').split('/')[1];
    return navGroups.find(g => g.paths.includes(segment)) ?? null;
  });
}
