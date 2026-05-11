import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

type UiButtonLinkVariant = 'ghost' | 'secondary' | 'primary' | 'danger';
type UiButtonLinkSize = 'sm' | 'md';

// Anchor sibling of UiButton. Renders <a routerLink="…"> with the same visual
// contract as UiButton — share styles via ui-button.shared.scss so the two stay
// pixel-identical. Use this for navigation; use UiButton for actions.
@Component({
  selector: 'app-ui-button-link',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  styleUrl: '../ui-button/ui-button.shared.scss',
  template: `
    <a
      [routerLink]="routerLink()"
      [attr.aria-label]="ariaLabel()"
      [class]="classes()"
    >
      <ng-content />
    </a>
  `,
})
export class UiButtonLink {
  readonly routerLink = input.required<unknown[] | string>();
  readonly ariaLabel  = input<string | null>(null);
  readonly size       = input<UiButtonLinkSize>('md');
  readonly variant    = input<UiButtonLinkVariant>('secondary');
  readonly iconOnly   = input(false);

  readonly classes = computed(() => {
    const parts = ['ui-button', `ui-button--${this.variant()}`, `ui-button--${this.size()}`];
    if (this.iconOnly()) parts.push('ui-button--icon-only');
    return parts.join(' ');
  });
}
