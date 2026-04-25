import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { DispatchStatus } from '@domain/dispatch';

// Small pill showing a dispatch status. Tone matches the active-chip palette
// in kanban-filter-bar.scss so card and filter chip read consistently.
//   approved    — neutral muted
//   dispatching — info blue
//   running     — warning amber
//   completed   — success green
//   failed      — danger red
@Component({
  selector: 'app-dispatch-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span [class]="cls()">{{ status() }}</span>`,
  styles: [`
    .badge {
      display: inline-block;
      font-family: var(--font-mono);
      font-size: 0.6rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      padding: 0.05rem 0.4rem;
      border: 1px solid;
      border-radius: 3px;
      line-height: 1.4;
    }
    .badge--approved    { color: var(--color-text-muted); border-color: var(--color-text-muted); }
    .badge--dispatching { color: var(--color-info);       border-color: var(--color-info);       }
    .badge--running     { color: var(--color-warning);    border-color: var(--color-warning);    }
    .badge--completed   { color: var(--color-success);    border-color: var(--color-success);    }
    .badge--failed      { color: var(--color-danger);     border-color: var(--color-danger);     }
  `],
})
export class DispatchStatusBadge {
  readonly status = input.required<DispatchStatus>();

  readonly cls = computed(() => `badge badge--${this.status()}`);
}
