import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-ui-meta-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<dl class="ui-meta-list"><ng-content /></dl>`,
  styles: [`
    .ui-meta-list {
      display: grid;
      grid-template-columns: max-content minmax(0, 1fr);
      gap: 0.6rem 1rem;
      margin: 0;
      min-width: 0;
    }

    .ui-meta-list:where(.ui-meta-list--single-column) {
      grid-template-columns: 1fr;
    }

    :host ::ng-deep dt {
      margin: 0;
      color: var(--color-text-muted);
      font-size: 0.72rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    :host ::ng-deep dd {
      margin: 0;
      min-width: 0;
      color: var(--color-text);
    }

    @media (max-width: 768px) {
      .ui-meta-list {
        grid-template-columns: 1fr;
        gap: 0.35rem;
      }
    }
  `],
  host: {
    '[class.ui-meta-list--single-column]': 'singleColumn()',
  },
})
export class UiMetaList {
  readonly singleColumn = input(false);
}
