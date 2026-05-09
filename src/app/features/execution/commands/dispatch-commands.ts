// Application-service / command layer for dispatch lifecycle gestures.
//
// Mirror of VaultItemCommands. Boards call this; they do NOT call mutation
// methods on DispatchService directly. The command layer is where compound
// gestures (archive-task-AND-dismiss-row) compose, and where intent ("the
// operator wants this row gone") translates into the right combination of
// underlying writes.

import { Injectable, inject } from '@angular/core';

import { DispatchService } from '@features/execution/data-access/dispatch.service';
import { VaultItemCommands } from '@features/vault-items/commands/vault-item-commands';
import type { DispatchId } from '@domain/ids';
import type { DispatchQueueEntry } from '@domain/dispatch';

@Injectable({ providedIn: 'root' })
export class DispatchCommands {
  private readonly dispatch = inject(DispatchService);
  private readonly vaultCommands = inject(VaultItemCommands);

  /**
   * Drop a finished dispatch row from view.
   *
   * Vault item is left intact — `dismiss` is purely about removing UI noise
   * for an entry whose work is done. Use `archiveTaskAndDismiss` when the
   * operator wants the underlying task gone too (typical for FAILED rows).
   */
  dismiss(id: DispatchId): void {
    this.dispatch.delete(id);
  }

  /**
   * For FAILED dispatches that the operator has decided aren't worth fixing.
   * Composes:
   *   1. Archive the underlying vault item (so it disappears from grooming
   *      board too, not just here)
   *   2. Delete the dispatch row (clears the stale failure entry)
   *
   * Order matters: archive first so if the dispatch delete fails we still
   * have the vault item out of view. Dispatch delete is the cosmetic cleanup.
   */
  archiveTaskAndDismiss(entry: DispatchQueueEntry): void {
    this.vaultCommands.archive(entry.task_id);
    this.dispatch.delete(entry.id);
  }

  /**
   * Column-level sweep: dismiss every completed dispatch in one gesture.
   * Useful for working through a backlog of stale "ran fine days ago" rows
   * without per-card clicks. Vault items are NOT touched — `complete` items
   * stay in their current grooming state.
   */
  clearCompleted(): void {
    this.dispatch.clearTerminal(['completed']);
  }

  /**
   * Sweep all failed dispatches. Same shape as clearCompleted but for the
   * FAILED column. Vault items are NOT archived — operator can use the
   * per-card archive action when they want the task gone too.
   */
  clearFailed(): void {
    this.dispatch.clearTerminal(['failed']);
  }
}
