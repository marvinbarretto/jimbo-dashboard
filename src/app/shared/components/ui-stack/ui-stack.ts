import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

type UiStackGap = 'xs' | 'sm' | 'md' | 'lg';
type UiStackAlign = 'stretch' | 'start' | 'center' | 'end';

@Component({
  selector: 'app-ui-stack',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div [class]="classes()"><ng-content /></div>`,
  styles: [`
    .ui-stack {
      display: flex;
      flex-direction: column;
      min-width: 0;
      align-items: stretch;
    }

    .ui-stack--gap-xs { gap: 0.25rem; }
    .ui-stack--gap-sm { gap: 0.5rem; }
    .ui-stack--gap-md { gap: 0.75rem; }
    .ui-stack--gap-lg { gap: 1rem; }

    .ui-stack--align-start { align-items: flex-start; }
    .ui-stack--align-center { align-items: center; }
    .ui-stack--align-end { align-items: flex-end; }
  `],
})
export class UiStack {
  readonly gap = input<UiStackGap>('md');
  readonly align = input<UiStackAlign>('stretch');

  readonly classes = computed(() => `ui-stack ui-stack--gap-${this.gap()} ui-stack--align-${this.align()}`);
}
