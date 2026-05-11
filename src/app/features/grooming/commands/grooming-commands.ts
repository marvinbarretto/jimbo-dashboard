// Application-service / command layer for grooming-board gestures.
//
// Mirror of DispatchCommands. Boards call this; they do NOT call
// VaultItemCommands.setStatus directly for kanban-specific gestures. The
// command layer is where grooming intent (drag-to-column, quick-reject from a
// card) translates into the right underlying writes — separating it keeps the
// "why force: true is OK here" reasoning out of the container.
//
// Vault-item primitives that are not grooming-specific (archive, reassign,
// approveForDispatch) stay on VaultItemCommands and are injected into the
// board alongside this class. Same split as execution-board uses.

import { Injectable, inject } from '@angular/core';

import { VaultItemCommands } from '@features/vault-items/commands/vault-item-commands';
import type { VaultItemId } from '@domain/ids';
import type { GroomingStatus } from '@domain/vault';

@Injectable({ providedIn: 'root' })
export class GroomingCommands {
  private readonly vaultCommands = inject(VaultItemCommands);

  /**
   * Operator dragged a card into a different column. Bypasses the transition
   * allowlist intentionally — exploration-time shoves are explicitly allowed
   * on the board; the strict gate is reserved for `approveForDispatch`. The
   * audit event still fires via VaultItemsService.setGroomingStatus.
   *
   * No-op when the item is already in the target status.
   */
  moveColumn(id: VaultItemId, next: GroomingStatus): void {
    this.vaultCommands.setStatus(id, next, { force: true });
  }

  /**
   * Card-level quick reject: status change to `needs_rework` with a reason
   * note, no reassignment. Distinct from the dialog's full
   * `rejectWithReason` (which composes reassign + thread message + 2 events) —
   * this is the lightweight gesture for "park it back with the same owner so
   * I can reply later".
   *
   * Forces the transition for the same reason as moveColumn: any column can
   * land in needs_rework when the operator says so.
   */
  quickReject(id: VaultItemId, reason: string): void {
    this.vaultCommands.setStatus(id, 'needs_rework', { reason, force: true });
  }
}
