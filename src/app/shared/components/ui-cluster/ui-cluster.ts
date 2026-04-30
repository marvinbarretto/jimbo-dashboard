import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

type UiClusterGap = 'xs' | 'sm' | 'md' | 'lg';
type UiClusterAlign = 'start' | 'center' | 'end' | 'baseline';
type UiClusterJustify = 'start' | 'center' | 'end' | 'between';

@Component({
  selector: 'app-ui-cluster',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div [class]="classes()"><ng-content /></div>`,
  styles: [`
    .ui-cluster {
      display: flex;
      flex-wrap: wrap;
      min-width: 0;
    }

    .ui-cluster--gap-xs { gap: 0.25rem; }
    .ui-cluster--gap-sm { gap: 0.5rem; }
    .ui-cluster--gap-md { gap: 0.75rem; }
    .ui-cluster--gap-lg { gap: 1rem; }

    .ui-cluster--align-start { align-items: flex-start; }
    .ui-cluster--align-center { align-items: center; }
    .ui-cluster--align-end { align-items: flex-end; }
    .ui-cluster--align-baseline { align-items: baseline; }

    .ui-cluster--justify-start { justify-content: flex-start; }
    .ui-cluster--justify-center { justify-content: center; }
    .ui-cluster--justify-end { justify-content: flex-end; }
    .ui-cluster--justify-between { justify-content: space-between; }
  `],
})
export class UiCluster {
  readonly gap = input<UiClusterGap>('sm');
  readonly align = input<UiClusterAlign>('center');
  readonly justify = input<UiClusterJustify>('start');

  readonly classes = computed(() =>
    `ui-cluster ui-cluster--gap-${this.gap()} ui-cluster--align-${this.align()} ui-cluster--justify-${this.justify()}`
  );
}
