import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-nav',
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="app-nav">
      <span class="app-nav__logo">jimbo</span>
      <ul>
        <li><a routerLink="/models" routerLinkActive="active">Models</a></li>
        <li><a routerLink="/model-stacks" routerLinkActive="active">Stacks</a></li>
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
export class Nav {}
