import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type ChildState = 'grooming' | 'ready' | 'running' | 'completed' | 'failed';

export interface ChildStatus {
  readonly seq: number;
  readonly state: ChildState;
}

@Component({
  selector: 'app-epic-rollup',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (children().length === 0) {
      <span class="epic-rollup epic-rollup--empty">no children yet</span>
    } @else {
      <span class="epic-rollup">
        <span class="epic-rollup__label">children</span>
        @for (child of children(); track child.seq) {
          <span [class]="dotCls(child.state)" [attr.title]="dotTitle(child)"></span>
        }
        <span class="epic-rollup__summary">
          <span class="epic-rollup__count">{{ doneCount() }}/{{ children().length }}</span>
          @if (runningCount() > 0) {
            · {{ runningCount() }} running
          }
          @if (failedCount() > 0) {
            · <span class="epic-rollup__failed">{{ failedCount() }} failed</span>
          }
        </span>
      </span>
    }
  `,
  styles: [`
    .epic-rollup {
      display: inline-flex;
      align-items: center;
      gap: 0.15rem;
      font-family: var(--font-mono);
      font-size: 0.65rem;
      color: var(--color-text-muted);
    }
    .epic-rollup--empty {
      color: var(--color-text-muted);
      font-style: italic;
    }
    .epic-rollup__label {
      color: var(--color-text-muted);
      font-size: 0.6rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-right: 0.25rem;
    }
    .rollup-dot {
      width: 0.55rem;
      height: 0.55rem;
      border-radius: 2px;
      background: var(--color-border);
      border: 1px solid var(--color-border);
    }
    .rollup-dot--grooming {
      background: color-mix(in srgb, var(--color-warning) 30%, transparent);
      border-color: var(--color-warning);
    }
    .rollup-dot--ready {
      background: color-mix(in srgb, var(--color-text-muted) 30%, transparent);
      border-color: var(--color-text-muted);
    }
    .rollup-dot--running {
      background: color-mix(in srgb, var(--color-info) 30%, transparent);
      border-color: var(--color-info);
    }
    .rollup-dot--completed {
      background: color-mix(in srgb, var(--color-success) 30%, transparent);
      border-color: var(--color-success);
    }
    .rollup-dot--failed {
      background: color-mix(in srgb, var(--color-danger) 30%, transparent);
      border-color: var(--color-danger);
    }
    .epic-rollup__summary {
      margin-left: 0.4rem;
      color: var(--color-text-muted);
    }
    .epic-rollup__count {
      color: var(--color-text);
    }
    .epic-rollup__failed {
      color: var(--color-danger);
    }
  `],
})
export class EpicRollup {
  readonly children = input.required<readonly ChildStatus[]>();

  protected readonly doneCount    = computed(() => this.children().filter(c => c.state === 'completed').length);
  protected readonly runningCount = computed(() => this.children().filter(c => c.state === 'running').length);
  protected readonly failedCount  = computed(() => this.children().filter(c => c.state === 'failed').length);

  protected dotCls(state: ChildState): string { return `rollup-dot rollup-dot--${state}`; }
  protected dotTitle(child: ChildStatus): string { return `#${child.seq} · ${child.state}`; }
}
