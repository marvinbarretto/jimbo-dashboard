import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export interface UiInlinePickerOption {
  readonly id: string;
  readonly label: string;
  readonly selected?: boolean;
}

@Component({
  selector: 'app-ui-inline-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="ui-inline-picker" role="listbox" [attr.aria-label]="ariaLabel()">
      @for (opt of options(); track opt.id) {
        <button
          type="button"
          class="ui-inline-picker__opt"
          role="option"
          [attr.aria-selected]="opt.selected ?? false"
          (click)="select(opt.id)">
          {{ opt.label }}
        </button>
      } @empty {
        <span class="ui-inline-picker__empty">No options available</span>
      }
    </span>
  `,
  styles: [`
    :host {
      display: contents;
    }

    .ui-inline-picker {
      display: flex;
      flex-direction: column;
      min-width: 140px;
      background: var(--color-bg);
      border: 1px solid var(--color-border);
      border-radius: 4px;
      overflow: hidden;
      box-shadow: 0 4px 12px color-mix(in oklab, var(--color-text) 10%, transparent);
    }

    .ui-inline-picker__opt {
      padding: 0.35rem 0.6rem;
      background: transparent;
      border: none;
      border-bottom: 1px solid var(--color-border);
      font: inherit;
      font-size: 0.72rem;
      text-align: left;
      cursor: pointer;
      color: var(--color-text);
    }

    .ui-inline-picker__opt:last-child {
      border-bottom: 0;
    }

    .ui-inline-picker__opt:hover {
      background: color-mix(in oklab, var(--color-accent) 10%, transparent);
      color: var(--color-accent);
    }

    .ui-inline-picker__opt[aria-selected='true'] {
      background: color-mix(in oklab, var(--color-accent) 16%, transparent);
      color: var(--color-text);
      font-weight: 600;
    }

    .ui-inline-picker__empty {
      padding: 0.35rem 0.6rem;
      color: var(--color-text-muted);
      font-size: 0.7rem;
      font-style: italic;
    }
  `],
})
export class UiInlinePicker {
  readonly options = input.required<readonly UiInlinePickerOption[]>();
  readonly ariaLabel = input<string | null>(null);
  readonly selected = output<string>();

  select(id: string): void {
    this.selected.emit(id);
  }
}
