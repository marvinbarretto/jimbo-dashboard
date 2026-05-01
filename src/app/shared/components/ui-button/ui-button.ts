import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

type UiButtonVariant = 'ghost' | 'secondary' | 'primary' | 'danger';
type UiButtonSize = 'sm' | 'md';

@Component({
  selector: 'app-ui-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      [attr.aria-label]="ariaLabel()"
      [class]="classes()"
      [disabled]="disabled()"
      [type]="type()"
      (click)="pressed.emit()"
    >
      <ng-content />
    </button>
  `,
  styles: [`
    .ui-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.35rem;
      min-height: 2.75rem;
      border-radius: var(--radius);
      border: 2px solid color-mix(in srgb, var(--button-color, var(--color-border-strong)) 65%, var(--color-border));
      background: var(--color-black);
      padding: 0.55rem 1rem;
      font-size: 0.78rem;
      font-weight: 700;
      line-height: 1.1;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      transition:
        border-color 120ms ease,
        background-color 120ms ease,
        color 120ms ease,
        box-shadow 120ms ease;
    }

    .ui-button:hover:not(:disabled) {
      border-color: var(--button-color, var(--color-accent));
    }

    .ui-button:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    .ui-button:focus-visible {
      outline: none;
      box-shadow: var(--focus-ring);
    }

    .ui-button--sm {
      min-height: 2.2rem;
      padding-inline: 0.75rem;
      font-size: 0.7rem;
    }

    .ui-button--ghost {
      --button-color: var(--color-text-soft);
      background: transparent;
      color: var(--color-text-soft);
      border-color: var(--color-border);
    }

    .ui-button--secondary {
      --button-color: var(--color-border-strong);
      background: var(--color-black);
      color: var(--color-text);
    }

    .ui-button--primary {
      --button-color: var(--color-accent);
      background: var(--color-black);
      color: var(--color-text);
      box-shadow: inset 0 0 0 1px var(--color-accent-glow);
    }

    .ui-button--danger {
      --button-color: var(--color-danger);
      background: var(--color-black);
      color: color-mix(in srgb, var(--color-danger) 88%, white);
      box-shadow: inset 0 0 0 1px var(--color-danger-glow);
    }
  `],
})
export class UiButton {
  readonly ariaLabel = input<string | null>(null);
  readonly disabled = input(false);
  readonly size = input<UiButtonSize>('md');
  readonly type = input<'button' | 'submit' | 'reset'>('button');
  readonly variant = input<UiButtonVariant>('secondary');

  readonly pressed = output<void>();

  readonly classes = computed(() => `ui-button ui-button--${this.variant()} ui-button--${this.size()}`);
}
