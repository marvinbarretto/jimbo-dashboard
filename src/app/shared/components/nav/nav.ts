import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { SyncButton } from '../sync-button/sync-button';
import pkg from '../../../../../package.json';

@Component({
  selector: 'app-nav',
  imports: [RouterLink, RouterLinkActive, SyncButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="app-nav">
      <span class="app-nav__logo">jimbo <span class="app-nav__version">v{{ version }}</span></span>
      <ul>
        <li><a routerLink="/vault-items" routerLinkActive="active">Vault</a></li>
        <li><a routerLink="/grooming" routerLinkActive="active">Grooming</a></li>
        <li><a routerLink="/execution" routerLinkActive="active">Execution</a></li>
        <li><a routerLink="/projects" routerLinkActive="active">Projects</a></li>
        <li><a routerLink="/actors" routerLinkActive="active">Actors</a></li>
        <li><a routerLink="/skills" routerLinkActive="active">Skills</a></li>
        <li><a routerLink="/models" routerLinkActive="active">Models</a></li>
        <li><a routerLink="/model-stacks" routerLinkActive="active">Stacks</a></li>
        <li><a routerLink="/coverage" routerLinkActive="active">Coverage</a></li>
      </ul>
      <app-sync-button />
    </nav>
  `,
  styles: [`
    .app-nav {
      display: flex;
      flex-direction: column;
      width: 200px;
      min-height: 100vh;
      background: var(--color-surface);
      border-right: 1px solid var(--color-border);
      padding: 1.5rem 1rem;
      gap: 2rem;
      flex-shrink: 0;

      @media (max-width: 768px) {
        flex-direction: row;
        align-items: center;
        width: 100%;
        min-height: unset;
        padding: 0.5rem 0.75rem;
        gap: 0;
        border-right: none;
        border-bottom: 1px solid var(--color-border);
        overflow-x: auto;
        scrollbar-width: none;

        &::-webkit-scrollbar { display: none; }
      }
    }

    .app-nav__logo {
      font-weight: 700;
      font-size: 1.1rem;
      letter-spacing: 0.05em;
      color: var(--color-accent);
      flex-shrink: 0;

      @media (max-width: 768px) {
        font-size: 0.85rem;
        margin-right: 0.5rem;
      }
    }

    .app-nav__version {
      font-size: 0.65rem;
      font-weight: 400;
      opacity: 0.5;
      letter-spacing: 0;
    }

    ul {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;

      @media (max-width: 768px) {
        flex-direction: row;
        flex-wrap: nowrap;
        gap: 0;
        flex: 1;
      }
    }

    a {
      display: block;
      padding: 0.4rem 0.6rem;
      border-radius: var(--radius);
      font-size: 0.875rem;
      color: var(--color-text-muted);
      text-decoration: none;

      &:hover { color: var(--color-text); }
      &.active { color: var(--color-text); background: var(--color-border); }

      @media (max-width: 768px) {
        padding: 0.4rem 0.5rem;
        font-size: 0.75rem;
        white-space: nowrap;
        border-radius: 0;
      }
    }
  `],
})
export class Nav {
  readonly version = pkg.version;
}
