import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

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
  // Cards actually projected into this column — i.e. post-cap.
  readonly count        = input.required<number>();
  // Cards the column holds before the render cap. Leave null on an uncapped
  // board. When it exceeds `count` the header reports the ratio and a
  // "show more" footer appears, so a cap can never misrepresent the backlog.
  readonly total        = input<number | null>(null);
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
  readonly showMore  = output<void>();

  // Cards held back by the render cap. 0 when the board is uncapped.
  readonly hidden = computed(() => Math.max(0, (this.total() ?? this.count()) - this.count()));

  // "25/690" is two numbers with no stated population, and on the grooming board
  // it sits beside a pump depth counting a different one. Spell it out on hover
  // rather than widen every column header on every board.
  readonly countHint = computed(() =>
    this.hidden() > 0
      ? `Showing ${this.count()} of ${this.total()} cards in this column`
      : `${this.count()} card${this.count() === 1 ? '' : 's'} in this column`,
  );

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
