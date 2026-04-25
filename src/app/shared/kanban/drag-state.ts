import { computed, signal, type Signal } from '@angular/core';

// Drag-state composable for kanban boards. Encapsulates the small DOM dance
// around HTML5 drag-and-drop (preventDefault, dataTransfer fiddling, "is this
// drop a no-op?" check) so each board doesn't have to reinvent it.
//
// The board owns:
//   - what's actually dragged (an id)
//   - what column statuses exist
//   - what to do on a successful drop (typically: setStatus(id, newStatus))
//
// The composable owns:
//   - the dragging / dropTarget signals
//   - DOM event plumbing
//   - drop-validity logic
//
// Usage (in a component constructor or class field):
//   readonly drag = createKanbanDragState<VaultItemId, GroomingStatus>(
//     id => this.service.getById(id)?.grooming_status
//   );
//   onDrop(event, status) {
//     const id = this.drag.onDrop(event, status);
//     if (id) this.service.setGroomingStatus(id, status, null);
//   }

export interface KanbanDragState<TId, TStatus> {
  /** Currently-dragged item id, or null. */
  dragging:   Signal<TId | null>;
  /** Column status currently hovered during a drag, or null. */
  dropTarget: Signal<TStatus | null>;

  /** Call from a card's `(dragstart)`. Records the id and seeds dataTransfer. */
  onDragStart(event: DragEvent, id: TId): void;

  /** Call from a card's `(dragend)`. Clears all drag state. */
  onDragEnd(): void;

  /** Call from a column's `(dragover)`. Sets dropTarget; preventDefaults so drop fires. */
  onDragOver(event: DragEvent, status: TStatus): void;

  /** Call from a column's `(dragleave)`. Clears dropTarget if it matches `status`. */
  onDragLeave(status: TStatus): void;

  /**
   * Call from a column's `(drop)`. Clears all drag state and returns the dragged
   * id IF the drop is valid (item exists and its current status differs from
   * the target). Returns null when the drop should be a no-op — caller can
   * skip its mutation entirely.
   */
  onDrop(event: DragEvent, status: TStatus): TId | null;

  /**
   * True when a card is being dragged AND `status` is a valid target (i.e. not
   * the dragged item's current status). Bind to the column's `[dropEligible]`.
   */
  isEligibleDropTarget(status: TStatus): boolean;
}

export function createKanbanDragState<TId, TStatus>(
  // Used by isEligibleDropTarget + onDrop to refuse same-column drops.
  // Caller supplies a lookup that returns the current status for a given id,
  // or undefined if the id is unknown.
  getCurrentStatus: (id: TId) => TStatus | undefined,
  // Optional — overrides the dataTransfer key used by setData. Useful when
  // multiple kanban boards coexist on the same page and need to ignore each
  // other's drags. Default works for typical single-board pages.
  dataKey: string = 'text/x-kanban-id',
): KanbanDragState<TId, TStatus> {
  const _dragging   = signal<TId | null>(null);
  const _dropTarget = signal<TStatus | null>(null);

  return {
    dragging:   _dragging.asReadonly(),
    dropTarget: _dropTarget.asReadonly(),

    onDragStart(event, id) {
      _dragging.set(id);
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData(dataKey, String(id));
      }
    },

    onDragEnd() {
      _dragging.set(null);
      _dropTarget.set(null);
    },

    onDragOver(event, status) {
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
      _dropTarget.set(status);
    },

    onDragLeave(status) {
      if (_dropTarget() === status) _dropTarget.set(null);
    },

    onDrop(event, status) {
      event.preventDefault();
      const id = _dragging();
      _dragging.set(null);
      _dropTarget.set(null);
      if (id === null) return null;
      if (getCurrentStatus(id) === status) return null;
      return id;
    },

    isEligibleDropTarget(status) {
      const id = _dragging();
      if (id === null) return false;
      return getCurrentStatus(id) !== status;
    },
  };
}
