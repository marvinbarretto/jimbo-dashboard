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
    }
  `],
})
export class TableShell {}
