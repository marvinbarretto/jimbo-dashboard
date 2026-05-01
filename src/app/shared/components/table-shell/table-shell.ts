import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-table-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-content />`,
  styles: [`
    :host {
      display: block;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      border: 1px solid var(--color-border);
      background: var(--color-surface-soft);
    }
  `],
})
export class TableShell {}
