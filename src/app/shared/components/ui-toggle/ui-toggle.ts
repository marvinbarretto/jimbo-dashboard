import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

@Component({
  selector: 'app-ui-toggle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      role="switch"
      class="ui-toggle"
      [class.ui-toggle--on]="checked()"
      [class.ui-toggle--disabled]="disabled()"
      [attr.aria-checked]="checked()"
      [attr.aria-label]="label()"
      [disabled]="disabled() || null"
      (click)="changed.emit(!checked())"
    >
      <span class="ui-toggle__track">
        <span class="ui-toggle__thumb"></span>
      </span>
    </button>
  `,
  styles: [`
    .ui-toggle {
      display: inline-flex;
      align-items: center;
      padding: 0;
      border: none;
      background: transparent;
      cursor: pointer;
      flex-shrink: 0;
    }

    .ui-toggle:focus-visible {
      outline: none;

      .ui-toggle__track {
        box-shadow: var(--focus-ring);
      }
    }

    .ui-toggle--disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .ui-toggle__track {
      position: relative;
      display: block;
      width: 2.25rem;
      height: 1.25rem;
      border-radius: 9999px;
      background: var(--color-border);
      transition: background 150ms ease;
    }

    .ui-toggle--on .ui-toggle__track {
      background: var(--color-success);
    }

    .ui-toggle__thumb {
      position: absolute;
      top: 50%;
      left: 0.2rem;
      transform: translateY(-50%);
      width: 0.85rem;
      height: 0.85rem;
      border-radius: 50%;
      background: #fff;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
      transition: left 150ms ease;
    }

    .ui-toggle--on .ui-toggle__thumb {
      left: calc(100% - 0.2rem - 0.85rem);
    }
  `],
})
export class UiToggle {
  readonly checked = input<boolean>(false);
  readonly label = input<string>('');
  readonly disabled = input<boolean>(false);

  readonly changed = output<boolean>();
}
