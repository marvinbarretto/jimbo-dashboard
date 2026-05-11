import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

type UiButtonVariant = 'ghost' | 'secondary' | 'primary' | 'danger';
type UiButtonSize = 'sm' | 'md';

@Component({
  selector: 'app-ui-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './ui-button.shared.scss',
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
})
export class UiButton {
  readonly ariaLabel = input<string | null>(null);
  readonly disabled  = input(false);
  readonly size      = input<UiButtonSize>('md');
  readonly type      = input<'button' | 'submit' | 'reset'>('button');
  readonly variant   = input<UiButtonVariant>('secondary');
  readonly iconOnly  = input(false);

  readonly pressed = output<void>();

  readonly classes = computed(() => {
    const parts = ['ui-button', `ui-button--${this.variant()}`, `ui-button--${this.size()}`];
    if (this.iconOnly()) parts.push('ui-button--icon-only');
    return parts.join(' ');
  });
}
