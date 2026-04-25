import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import pkg from '../../../../../package.json';

@Component({
  selector: 'app-nav',
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="app-nav">
      <span class="app-nav__logo">jimbo <span class="app-nav__version">v{{ version }}</span></span>
      <ul>
        <li><a routerLink="/vault-items" routerLinkActive="active">Vault</a></li>
        <li><a routerLink="/grooming" routerLinkActive="active">Grooming</a></li>
        <li><a routerLink="/projects" routerLinkActive="active">Projects</a></li>
        <li><a routerLink="/actors" routerLinkActive="active">Actors</a></li>
        <li><a routerLink="/models" routerLinkActive="active">Models</a></li>
        <li><a routerLink="/model-stacks" routerLinkActive="active">Stacks</a></li>
        <li><a routerLink="/skills" routerLinkActive="active">Skills</a></li>
        <li><a routerLink="/prompts" routerLinkActive="active">Prompts</a></li>
        <li><a routerLink="/tools" routerLinkActive="active">Tools</a></li>
        <li><a routerLink="/coverage" routerLinkActive="active">Coverage</a></li>
      </ul>
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
    }

    .app-nav__logo {
      font-weight: 700;
      font-size: 1.1rem;
      letter-spacing: 0.05em;
      color: var(--color-accent);
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
    }
  `],
})
export class Nav {
  readonly version = pkg.version;
}
