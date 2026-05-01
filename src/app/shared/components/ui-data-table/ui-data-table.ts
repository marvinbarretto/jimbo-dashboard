import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import {
  createAngularTable,
  FlexRenderDirective,
  type Cell,
  getCoreRowModel,
  getSortedRowModel,
  type ColumnDef,
  type RowData,
  type SortingState,
} from '@tanstack/angular-table';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';

@Component({
  selector: 'app-ui-data-table',
  imports: [FlexRenderDirective, UiEmptyState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (data().length === 0) {
      <app-ui-empty-state [title]="emptyTitle()" [message]="emptyMessage()" />
    } @else {
      <div class="ui-data-table__shell">
        <table class="ui-data-table" [attr.aria-label]="ariaLabel()">
          @if (caption(); as tableCaption) {
            <caption class="ui-data-table__caption">{{ tableCaption }}</caption>
          }

          <thead class="ui-data-table__head">
            @for (headerGroup of table().getHeaderGroups(); track headerGroup.id) {
              <tr class="ui-data-table__row ui-data-table__row--head">
                @for (header of headerGroup.headers; track header.id) {
                  <th
                    class="ui-data-table__head-cell"
                    [class.ui-data-table__head-cell--sortable]="header.column.getCanSort()"
                    [style.width]="header.getSize() ? header.getSize() + 'px' : null"
                    scope="col">
                    @if (header.isPlaceholder) {
                      <span aria-hidden="true"></span>
                    } @else if (header.column.getCanSort()) {
                      <button
                        type="button"
                        class="ui-data-table__sort-button"
                        [attr.aria-label]="sortLabel(header.column.columnDef.header)"
                        (click)="header.column.toggleSorting()">
                        <ng-container
                          *flexRender="
                            header.column.columnDef.header;
                            props: header.getContext();
                            let renderedHeader
                          ">
                          {{ renderedHeader }}
                        </ng-container>
                        <span class="ui-data-table__sort-indicator" aria-hidden="true">
                          {{ sortIndicator(header.column.getIsSorted()) }}
                        </span>
                      </button>
                    } @else {
                      <ng-container
                        *flexRender="
                          header.column.columnDef.header;
                          props: header.getContext();
                          let renderedHeader
                        ">
                        {{ renderedHeader }}
                      </ng-container>
                    }
                  </th>
                }
              </tr>
            }
          </thead>

          <tbody class="ui-data-table__body">
            @for (row of table().getRowModel().rows; track row.id) {
              <tr class="ui-data-table__row" [class]="rowClassFor(row.original)">
                @for (cell of row.getVisibleCells(); track cell.id) {
                  <td class="ui-data-table__cell">
                    @if (hasCellTemplate(cell)) {
                      <ng-container
                        *flexRender="
                          cellTemplate(cell);
                          props: cell.getContext();
                          let renderedCell
                        ">
                        {{ renderedCell }}
                      </ng-container>
                    } @else {
                      {{ cell.renderValue() }}
                    }
                  </td>
                }
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
  styles: [`
    :host {
      display: block;
      min-width: 0;
    }

    .ui-data-table__shell {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      border: 1px solid var(--color-border);
      background: var(--color-surface-soft);
    }

    .ui-data-table {
      min-width: 100%;
      border-collapse: collapse;
    }

    .ui-data-table__caption {
      padding: 0.85rem 1rem 0;
      text-align: left;
      color: var(--color-text-muted);
      font-size: 0.84rem;
    }

    .ui-data-table__head {
      background: var(--color-surface-soft);
    }

    .ui-data-table__head-cell {
      position: sticky;
      top: 0;
      z-index: 1;
      background: var(--color-surface-soft);
      color: var(--color-text-soft);
      vertical-align: middle;
    }

    .ui-data-table__head-cell--sortable {
      padding: 0;
    }

    .ui-data-table__sort-button {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      width: 100%;
      min-height: 100%;
      padding: 0.8rem 0.9rem;
      border: 0;
      background: transparent;
      color: inherit;
      font-size: inherit;
      font-weight: inherit;
      letter-spacing: inherit;
      text-transform: inherit;
    }

    .ui-data-table__sort-button:hover {
      background: color-mix(in srgb, var(--color-accent) 6%, transparent);
    }

    .ui-data-table__sort-button:focus-visible {
      outline: none;
      box-shadow: inset var(--focus-ring);
    }

    .ui-data-table__sort-indicator {
      color: var(--color-accent);
      font-size: 0.8rem;
      line-height: 1;
    }

    .ui-data-table__row:hover {
      background: color-mix(in srgb, var(--color-accent) 5%, transparent);
    }

    .ui-data-table__row:focus-within {
      outline: 2px solid var(--color-accent);
      outline-offset: -2px;
    }

    .ui-data-table__cell {
      vertical-align: middle;
    }
  `],
})
export class UiDataTable<TData extends RowData> {
  readonly ariaLabel = input<string | null>(null);
  readonly caption = input<string | null>(null);
  readonly columns = input.required<ColumnDef<TData, any>[]>();
  readonly data = input.required<readonly TData[]>();
  readonly emptyTitle = input('No rows');
  readonly emptyMessage = input('Nothing to display.');
  readonly rowClass = input<((row: TData) => string | null) | null>(null);

  private readonly sorting = signal<SortingState>([]);

  readonly table = createAngularTable<TData>(() => ({
    data: [...this.data()],
    columns: this.columns(),
    state: {
      sorting: this.sorting(),
    },
    onSortingChange: updater => {
      this.sorting.set(typeof updater === 'function' ? updater(this.sorting()) : updater);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  }));

  sortIndicator(direction: false | 'asc' | 'desc'): string {
    if (direction === 'asc') return '↑';
    if (direction === 'desc') return '↓';
    return '↕';
  }

  rowClassFor(row: TData): string {
    return this.rowClass()?.(row) ?? '';
  }

  hasCellTemplate(cell: Cell<TData, unknown>): boolean {
    return !!cell.column.columnDef.cell;
  }

  cellTemplate(cell: Cell<TData, unknown>) {
    return cell.column.columnDef.cell!;
  }

  sortLabel(header: unknown): string {
    return `Sort by ${typeof header === 'string' ? header : 'column'}`;
  }
}
