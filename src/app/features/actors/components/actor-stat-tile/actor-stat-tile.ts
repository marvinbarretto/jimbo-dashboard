import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-actor-stat-tile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="actor-stat-tile">
      <span class="actor-stat-tile__value">{{ value() }}</span>
      <span class="actor-stat-tile__label">{{ label() }}</span>
      @if (hint(); as h) {
        <span class="actor-stat-tile__hint">{{ h }}</span>
      }
    </div>
  `,
  styles: [`
    .actor-stat-tile {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      padding: 0.75rem 1rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      background: var(--color-surface-soft);
      min-width: 7rem;
    }
    .actor-stat-tile__value {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--color-text);
      line-height: 1;
    }
    .actor-stat-tile__label {
      font-size: 0.75rem;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .actor-stat-tile__hint {
      font-size: 0.7rem;
      color: var(--color-text-muted);
      margin-top: 0.15rem;
    }
  `],
})
export class ActorStatTile {
  readonly label = input.required<string>();
  readonly value = input.required<number | string>();
  readonly hint = input<string | null>(null);
}
