import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-ui-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<section [class]="classes()"><ng-content /></section>`,
  styles: [`
    .ui-card {
      display: block;
      min-width: 0;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      background: var(--color-surface);
    }

    .ui-card--soft {
      background: var(--color-surface-soft);
    }

    .ui-card--compact {
      border-radius: 10px;
    }
  `],
})
export class UiCard {
  readonly tone = input<'default' | 'soft'>('default');
  readonly compact = input(false);

  readonly classes = computed(() => {
    const classes = ['ui-card'];
    if (this.tone() === 'soft') {
      classes.push('ui-card--soft');
    }
    if (this.compact()) {
      classes.push('ui-card--compact');
    }
    return classes.join(' ');
  });
}
