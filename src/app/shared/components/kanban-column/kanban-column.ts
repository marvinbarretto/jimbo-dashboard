import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

// Generic kanban column — used by any board (grooming, execution, future).
// Header + drop-zone + projected card list. Drop / dragover / dragleave are
// forwarded to the parent so the board owns drop state and the relevant
// service handles the write (setGroomingStatus, retryDispatch, etc.).
@Component({
  selector: 'app-kanban-column',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './kanban-column.html',
  styleUrl: './kanban-column.scss',
})
export class KanbanColumn {
  readonly label        = input.required<string>();
  readonly count        = input.required<number>();
  // True when a card is being dragged AND this column is a valid target
  // (dragged card isn't already in this column). Drives a subtle border tint.
  readonly dropEligible = input<boolean>(false);
  // True when the cursor is over this column during a drag. Stronger highlight.
  readonly dropActive   = input<boolean>(false);
  // When true, the column refuses drops (used for status values that aren't a
  // legal manual transition — e.g. "running" on the execution board).
  readonly dropDisabled = input<boolean>(false);
  // True while the parent board's data source is loading. Renders ghost cards
  // instead of the empty-state copy so the operator sees "fetching" rather
  // than misreading a still-loading column as genuinely empty.
  readonly loading      = input<boolean>(false);
  // Per-column empty-state copy. Status-specific lines read better than a
  // generic "empty" — the parent board knows the column's purpose.
  readonly emptyLabel   = input<string>('Nothing here');

  readonly dragover  = output<DragEvent>();
  readonly dragleave = output<void>();
  readonly drop      = output<DragEvent>();

  onDragOver(event: DragEvent): void {
    if (this.dropDisabled()) return;
    this.dragover.emit(event);
  }
  onDragLeave(): void { this.dragleave.emit(); }
  onDrop(event: DragEvent): void {
    if (this.dropDisabled()) return;
    this.drop.emit(event);
  }
}
