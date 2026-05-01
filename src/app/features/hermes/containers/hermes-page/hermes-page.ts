import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { HermesService } from '../../data-access/hermes.service';

@Component({
  selector: 'app-hermes-page',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="hermes-page">
      <header class="hermes-page__header">
        <div class="hermes-page__title-group">
          <h1 class="hermes-page__title">Hermes</h1>
          <p class="hermes-page__subtitle">
            {{ total() }} jobs &middot;
            <span class="hermes-page__stat hermes-page__stat--active">{{ activeCount() }} active</span> &middot;
            <span class="hermes-page__stat hermes-page__stat--paused">{{ pausedCount() }} paused</span>
            @if (failingCount() > 0) {
              &middot;
              <span class="hermes-page__stat hermes-page__stat--failing">{{ failingCount() }} failing</span>
            }
          </p>
        </div>
        <div class="hermes-page__live" [class.hermes-page__live--running]="isRunning()">
          <span class="hermes-page__live-dot"></span>
          {{ isRunning() ? 'Running' : 'Idle' }}
        </div>
      </header>

      <nav class="hermes-page__tabs" aria-label="Hermes views">
        <a routerLink="pulse" routerLinkActive="active" class="hermes-page__tab">Pulse</a>
        <a routerLink="control-room" routerLinkActive="active" class="hermes-page__tab">Control Room</a>
        <a routerLink="timeline" routerLinkActive="active" class="hermes-page__tab">Timeline</a>
      </nav>

      <div class="hermes-page__body">
        <router-outlet />
      </div>
    </div>
  `,
  styles: [`
    .hermes-page {
      display: flex;
      flex-direction: column;
      min-height: 100%;
    }

    .hermes-page__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      padding: 1.5rem 1.5rem 1rem;
    }

    .hermes-page__title {
      margin: 0 0 0.25rem;
      font-size: 1.25rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .hermes-page__subtitle {
      margin: 0;
      font-size: 0.8rem;
      color: var(--color-text-muted);
    }

    .hermes-page__stat--active { color: var(--color-success); }
    .hermes-page__stat--paused { color: var(--color-warning); }
    .hermes-page__stat--failing { color: var(--color-danger); font-weight: 700; }

    .hermes-page__live {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.72rem;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--color-text-muted);
      padding: 0.35rem 0.7rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
    }

    .hermes-page__live--running {
      color: var(--color-success);
      border-color: color-mix(in srgb, var(--color-success) 40%, var(--color-border));
      background: color-mix(in srgb, var(--color-success) 6%, transparent);
    }

    .hermes-page__live-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
    }

    .hermes-page__live--running .hermes-page__live-dot {
      animation: pulse-dot 1.4s ease-in-out infinite;
    }

    @keyframes pulse-dot {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.7); }
    }

    .hermes-page__tabs {
      display: flex;
      gap: 0;
      padding: 0 1.5rem;
      border-bottom: 1px solid var(--color-border);
    }

    .hermes-page__tab {
      padding: 0.6rem 1.1rem;
      font-size: 0.78rem;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-decoration: none;
      color: var(--color-text-muted);
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
      transition: color 0.15s, border-color 0.15s;
    }

    .hermes-page__tab:hover { color: var(--color-text); }

    .hermes-page__tab.active {
      color: var(--color-accent);
      border-bottom-color: var(--color-accent);
    }

    .hermes-page__body {
      flex: 1;
      padding: 1.5rem;
    }
  `],
})
export class HermesPage {
  private readonly hermes = inject(HermesService);

  readonly total = this.hermes.total;
  readonly activeCount = this.hermes.activeCount;
  readonly pausedCount = this.hermes.pausedCount;
  readonly failingCount = this.hermes.failingCount;
  readonly isRunning = computed(() => this.hermes.runningJobs().length > 0);
}
