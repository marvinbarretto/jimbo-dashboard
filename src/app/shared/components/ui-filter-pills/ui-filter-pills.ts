import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

export interface UiFilterPillOption {
  readonly value: string;
  readonly label: string;
  readonly count?: number;
}

/**
 * Multi-select pill row. Unlike `app-ui-segmented` (one-of-N), every pill can
 * be toggled independently. The host owns the active-set semantics — including
 * exclusive cases like "all" wiping the others.
 */
@Component({
  selector: 'app-ui-filter-pills',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="ui-filter-pills" [attr.aria-label]="ariaLabel()">
      @for (opt of options(); track opt.value) {
        <button
          type="button"
          class="ui-filter-pills__pill"
          [class.ui-filter-pills__pill--active]="activeSet().has(opt.value)"
          [attr.aria-pressed]="activeSet().has(opt.value)"
          (click)="toggled.emit(opt.value)"
        >
          {{ opt.label }}@if (opt.count != null) {
            <span class="ui-filter-pills__count">{{ opt.count }}</span>
          }
        </button>
      }
    </nav>
  `,
  styles: [`
    :host { display: block; }

    .ui-filter-pills {
      display: flex;
      gap: 0.35rem;
      flex-wrap: wrap;
    }

    .ui-filter-pills__pill {
      font: inherit;
      font-size: 0.72rem;
      padding: 0.22rem 0.6rem;
      background: var(--color-surface);
      color: var(--color-text-muted);
      cursor: pointer;
      border: 1px solid var(--color-border);
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      line-height: 1.4;

      &:hover:not(&--active) {
        color: var(--color-text);
        border-color: color-mix(in srgb, var(--color-text) 25%, var(--color-border));
      }

      &--active {
        background: var(--color-accent);
        color: var(--color-bg);
        border-color: transparent;
      }

      &:focus-visible {
        outline: 2px solid var(--color-accent);
        outline-offset: 1px;
      }
    }

    .ui-filter-pills__count {
      font-variant-numeric: tabular-nums;
      opacity: 0.7;
      font-size: 0.95em;
    }
  `],
})
export class UiFilterPills {
  readonly options = input.required<readonly UiFilterPillOption[]>();
  readonly active = input<readonly string[]>([]);
  readonly ariaLabel = input<string>('Filters');

  readonly toggled = output<string>();

  protected readonly activeSet = computed(() => new Set(this.active()));
}
