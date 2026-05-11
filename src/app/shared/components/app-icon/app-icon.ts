import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { ICONS, type IconName } from './icon-registry';

@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideAngularModule],
  template: `
    <lucide-icon
      [img]="data()"
      [size]="size()"
      [attr.role]="ariaLabel() ? 'img' : null"
      [attr.aria-label]="ariaLabel()"
      [attr.aria-hidden]="ariaLabel() ? null : 'true'" />
  `,
  styles: [`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      line-height: 0;
      vertical-align: middle;
      color: inherit;
    }
    /* lucide-icon strokes default to currentColor — host color cascades. */
  `],
})
export class AppIcon {
  readonly name      = input.required<IconName>();
  readonly size      = input<number>(16);

  // Provide an aria-label when the icon carries meaning on its own (e.g. icon-only
  // button). Leave null when the icon is decorative next to a visible text label.
  readonly ariaLabel = input<string | null>(null);

  protected readonly data = computed(() => ICONS[this.name()]);
}
