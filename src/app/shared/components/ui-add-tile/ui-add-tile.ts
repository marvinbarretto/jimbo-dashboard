import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-ui-add-tile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="ui-add-tile"
      [attr.aria-label]="ariaLabel() ?? label()"
      (click)="pressed.emit()"
    >
      <span class="ui-add-tile__plus" aria-hidden="true">+</span>
      <span class="ui-add-tile__label">{{ label() }}</span>
    </button>
  `,
  styles: [`
    .ui-add-tile {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      min-height: 100%;
      padding: 1.25rem 1rem;
      border: 1px dashed var(--color-border);
      border-radius: var(--radius-lg);
      background: transparent;
      color: var(--color-text-muted);
      font-family: var(--font-mono);
      cursor: pointer;
      transition: border-color 120ms ease, color 120ms ease, background 120ms ease;
    }

    .ui-add-tile:hover {
      border-color: var(--color-accent);
      color: var(--color-text);
      background: color-mix(in srgb, var(--color-accent) 6%, transparent);
    }

    .ui-add-tile:focus-visible {
      outline: none;
      box-shadow: var(--focus-ring);
    }

    .ui-add-tile__plus {
      font-size: 1.25rem;
      line-height: 1;
      font-weight: 600;
      color: var(--color-text-soft);
    }

    .ui-add-tile__label {
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
  `],
})
export class UiAddTile {
  /** Visible label, also used as the default aria-label. */
  readonly label = input.required<string>();
  /** Override aria-label when the visible label needs more screen-reader context. */
  readonly ariaLabel = input<string | null>(null);

  readonly pressed = output<void>();
}
