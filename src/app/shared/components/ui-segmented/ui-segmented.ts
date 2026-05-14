import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export interface UiSegmentedOption {
  readonly value: string;
  readonly label: string;
}

@Component({
  selector: 'app-ui-segmented',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ui-segmented" role="radiogroup" [attr.aria-label]="ariaLabel()">
      @for (opt of options(); track opt.value) {
        <button
          type="button"
          class="ui-segmented__btn"
          [class.ui-segmented__btn--active]="value() === opt.value"
          role="radio"
          [attr.aria-checked]="value() === opt.value"
          (click)="changed.emit(opt.value)"
        >{{ opt.label }}</button>
      }
    </div>
  `,
  styles: [`
    :host { display: inline-flex; }

    .ui-segmented {
      display: inline-flex;
      border: 1px solid var(--color-border);
      border-radius: 4px;
      overflow: hidden;
      background: var(--color-surface);
    }

    .ui-segmented__btn {
      font: inherit;
      font-size: 0.72rem;
      padding: 0.25rem 0.65rem;
      background: transparent;
      color: var(--color-text-muted);
      border: 0;
      cursor: pointer;
      line-height: 1.4;

      & + & {
        border-left: 1px solid var(--color-border);
      }

      &:hover:not(&--active) {
        background: color-mix(in oklab, var(--color-text) 8%, transparent);
        color: var(--color-text);
      }

      &--active {
        background: var(--color-accent);
        color: var(--color-bg);
      }

      &:focus-visible {
        outline: 2px solid var(--color-accent);
        outline-offset: -2px;
      }
    }
  `],
})
export class UiSegmented {
  readonly options = input.required<readonly UiSegmentedOption[]>();
  readonly value = input.required<string>();
  readonly ariaLabel = input<string>('Selection');

  readonly changed = output<string>();
}
