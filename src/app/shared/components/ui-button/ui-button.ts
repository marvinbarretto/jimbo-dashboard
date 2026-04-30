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
      min-height: 2rem;
      border-radius: 999px;
      border: 1px solid color-mix(in srgb, var(--button-color, var(--color-border)) 40%, var(--color-border));
      padding: 0.35rem 0.75rem;
      font-size: 0.78rem;
      font-weight: 600;
      line-height: 1.1;
      transition:
        border-color 120ms ease,
        background-color 120ms ease,
        color 120ms ease,
        transform 120ms ease;
    }

    .ui-button:hover:not(:disabled) {
      transform: translateY(-1px);
    }

    .ui-button:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    .ui-button--sm {
      min-height: 1.7rem;
      padding-inline: 0.55rem;
      font-size: 0.68rem;
    }

    .ui-button--ghost {
      --button-color: var(--color-text-soft);
      background: transparent;
      color: var(--color-text-soft);
      border-color: transparent;
    }

    .ui-button--secondary {
      --button-color: var(--color-text-soft);
      background: color-mix(in srgb, var(--color-surface-raised) 72%, transparent);
      color: var(--color-text);
    }

    .ui-button--primary {
      --button-color: var(--color-accent);
      background: color-mix(in srgb, var(--color-accent) 18%, var(--color-surface));
      color: var(--color-text);
    }

    .ui-button--danger {
      --button-color: var(--color-danger);
      background: color-mix(in srgb, var(--color-danger) 12%, var(--color-surface));
      color: var(--color-danger);
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
