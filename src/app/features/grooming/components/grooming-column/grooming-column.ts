import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

// Column shell — header, drop zone, projected card list.
// Drop / dragover / dragleave are forwarded to the parent so the kanban can
// own the drop state and call setGroomingStatus on success.
@Component({
  selector: 'app-grooming-column',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './grooming-column.html',
  styleUrl: './grooming-column.scss',
})
export class GroomingColumn {
  readonly label         = input.required<string>();
  readonly count         = input.required<number>();
  // True when a card is currently being dragged AND this column is a valid target
  // (i.e. dragged card isn't already in this column).
  readonly dropEligible  = input<boolean>(false);
  // True when the cursor is currently over this column during a drag.
  readonly dropActive    = input<boolean>(false);

  readonly dragover  = output<DragEvent>();
  readonly dragleave = output<void>();
  readonly drop      = output<DragEvent>();

  onDragOver(event: DragEvent): void {
    // Caller handles preventDefault — we just forward.
    this.dragover.emit(event);
  }
  onDragLeave(): void { this.dragleave.emit(); }
  onDrop(event: DragEvent): void { this.drop.emit(event); }
}
