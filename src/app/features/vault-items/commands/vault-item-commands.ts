// Application-service / command layer over VaultItemsService.
//
// Why this exists: VaultItemsService is the data-access layer (HTTP +
// optimistic state). It writes one column at a time. This file is where
// COMPOUND, GATED operations live — actions that the funnel actually cares
// about, with their preconditions, side-effects and audit-trail composition
// expressed in one place.
//
// Hard rule: components, dialogs, and kanban boards call methods on this
// class. They do NOT call mutation methods on VaultItemsService directly.
// That keeps the funnel logic in one file you can read top-to-bottom and
// reason about. Read paths (items(), getById, etc) stay open because they
// are signal queries with no side effects.

import { Injectable, inject } from '@angular/core';

import { VaultItemsService } from '@features/vault-items/data-access/vault-items.service';
import { ThreadService } from '@features/thread/data-access/thread.service';
import { VaultItemDependenciesService } from '@features/vault-items/data-access/vault-item-dependencies.service';
import { ToastService } from '@shared/components/toast/toast.service';

import { computeReadiness } from '@domain/vault/readiness';
import { isAllowedTransition } from '@domain/vault/transitions';
import { ownerForGroomingState } from '@domain/vault/grooming-ownership';
import type { VaultItemId, ActorId } from '@domain/ids';
import type { GroomingStatus } from '@domain/vault/vault-item';

@Injectable({ providedIn: 'root' })
export class VaultItemCommands {
  private readonly vaultItems = inject(VaultItemsService);
  private readonly thread = inject(ThreadService);
  private readonly deps = inject(VaultItemDependenciesService);
  private readonly toast = inject(ToastService);

  // ── Lifecycle commands ──────────────────────────────────────────────────

  /**
   * Soft-archive. Sets archived_at, emits an `archived` event, toasts on
   * success. Hosts (modal, page route) listen for archived_at and decide how
   * to dismiss themselves — the command does not care about routing.
   *
   * No-op when already archived.
   */
  archive(id: VaultItemId, reason: string | null = null): void {
    const item = this.vaultItems.getById(id);
    // Already archived is a legitimate no-op. Not being in the store at all is
    // not — it means a caller holds an item this service cannot act on, and
    // returning silently makes the archive vanish with no signal anywhere.
    if (!item) {
      console.warn('[vault-items] archive() ignored — item not in store', { id });
      return;
    }
    if (item.archived_at) return;
    this.vaultItems.archive(id, reason);
  }

  /**
   * Hard delete. Removes the row entirely — irreversible. Reserved for
   * "shouldn't have existed" items (accidental captures, garbled input,
   * test artefacts). For everything else, prefer archive() to preserve
   * audit trail and reversibility.
   */
  delete(id: VaultItemId): void {
    const item = this.vaultItems.getById(id);
    if (!item) return;
    this.vaultItems.remove(id);
  }

  /**
   * Mark as complete. No-op when already complete; writes completed_at and
   * emits a completion_changed event. Used by the manual-track "done" button
   * in the execution board and the modal action bar.
   */
  complete(id: VaultItemId): void {
    const item = this.vaultItems.getById(id);
    if (!item || item.completed_at) return;
    this.vaultItems.setCompleted(id, true, null);
  }

  /**
   * Start manual work — stamps started_at so the card moves into the In Progress
   * lane on the execution board. Reopens the item first if it was completed (so a
   * drag Done → In Progress works). No-op when already active + started.
   *
   * started_at is the manual-track analogue of a commission entering 'running':
   * agents derive their lane from the dispatch stage, humans from this marker.
   */
  startWork(id: VaultItemId): void {
    const item = this.vaultItems.getById(id);
    if (!item) return;
    if (item.completed_at) this.vaultItems.setCompleted(id, false, null);
    if (item.started_at) return; // already in progress
    this.vaultItems.update(id, { started_at: new Date().toISOString() });
  }

  /**
   * Move a manual card back to Ready — clears started_at and reopens it if it was
   * completed. The inverse of startWork() / complete().
   */
  moveToReady(id: VaultItemId): void {
    const item = this.vaultItems.getById(id);
    if (!item) return;
    if (item.completed_at) this.vaultItems.setCompleted(id, false, null);
    if (item.started_at) this.vaultItems.update(id, { started_at: null });
  }

  /**
   * Approve an item for dispatch — moves grooming_status to 'ready'.
   *
   * THIS IS THE GATE. The screenshot's "expected ungroomed, got intake_rejected"
   * dispatch failures happened because items moved to ready without satisfying
   * the readiness predicates. Here we refuse and toast the failing checks
   * instead of silently advancing into a state agents can't claim cleanly.
   *
   * The `grooming_complete` readiness check is excluded from the gate (it's
   * what we're about to set) — every other check must pass.
   */
  approveForDispatch(id: VaultItemId): void {
    const item = this.vaultItems.getById(id);
    if (!item) return;
    if (item.grooming_status === 'ready') return; // no-op

    if (!isAllowedTransition(item.grooming_status, 'ready')) {
      this.toast.error(`Cannot approve from ${item.grooming_status.replace('_', ' ')}`);
      return;
    }

    const messages = this.thread.messagesFor(id)();
    const blockers = this.deps.blockersFor(id)();
    const readiness = computeReadiness(item, messages, blockers);

    const failing = readiness.checks.filter(c => c.key !== 'grooming_complete' && !c.ok);
    if (failing.length > 0) {
      const reasons = failing.map(c => c.blocker).filter(Boolean).join('; ');
      this.toast.error(`Can't approve — ${reasons}`);
      return;
    }

    this.vaultItems.setGroomingStatus(id, 'ready', null);
  }

  /**
   * Reject with reason — composes patch + thread message + activity event +
   * reassign in a single atomic gesture. Lifted unchanged from
   * VaultItemsService.rejectItem; this is the central place to call it from.
   *
   * Validation is enforced by the underlying service (`reason` must be ≥12
   * chars). We catch the synchronous throws from there and toast them so the
   * caller has a uniform error surface — no try/catch in templates.
   */
  rejectWithReason(id: VaultItemId, reason: string, newOwner: ActorId): void {
    try {
      this.vaultItems.rejectItem(id, reason, newOwner);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Reject failed';
      this.toast.error(msg);
    }
  }

  /**
   * Reassign ownership. No-op when the new owner equals the current one.
   * Wraps `vaultItems.reassign` which emits the `assigned` audit event.
   * Used by the kanban card's owner picker and any other surface where the
   * operator changes who owns an item.
   */
  reassign(id: VaultItemId, toActor: ActorId, reason: string | null = null): void {
    const item = this.vaultItems.getById(id);
    if (!item || item.assigned_to === toActor) return;
    this.vaultItems.reassign(id, toActor, reason);
  }

  /**
   * Move to a specific grooming_status. Used by kanban drag-drop and other
   * operator-driven moves. Advisory — refuses with a toast if the transition
   * isn't in the allowlist, but callers who genuinely need to override (e.g.
   * during exploration) can pass `force: true`.
   */
  setStatus(id: VaultItemId, next: GroomingStatus, opts?: { reason?: string | null; force?: boolean }): void {
    const item = this.vaultItems.getById(id);
    if (!item || item.grooming_status === next) return;

    if (!opts?.force && !isAllowedTransition(item.grooming_status, next)) {
      this.toast.error(
        `Skip from ${item.grooming_status.replace('_', ' ')} → ${next.replace('_', ' ')} not allowed`,
      );
      return;
    }

    this.vaultItems.setGroomingStatus(id, next, opts?.reason ?? null);

    // Auto-reassign on transition: each grooming state has a canonical owner
    // (see OWNER_BY_GROOMING_STATE). The handoff happens automatically so
    // the operator never has to manually pass the baton.
    const nextOwner = ownerForGroomingState(next, item.assigned_to);
    if (nextOwner) {
      this.vaultItems.reassign(id, nextOwner, `auto-reassigned for ${next}`);
    }
  }

  /**
   * One-shot sweep: walk every active vault item and reassign it to the
   * canonical owner for its current grooming state. Intended to be triggered
   * once after the auto-reassign rule landed, so existing items align with
   * the policy without waiting for a transition.
   *
   * Returns the count of reassignments emitted. No-op when the current owner
   * already matches.
   */
  reconcileOwnership(): number {
    let reassigned = 0;
    for (const item of this.vaultItems.items()) {
      if (item.completed_at || item.archived_at) continue;
      const nextOwner = ownerForGroomingState(item.grooming_status, item.assigned_to);
      if (nextOwner) {
        this.vaultItems.reassign(item.id, nextOwner, `reconcile: ${item.grooming_status}`);
        reassigned++;
      }
    }
    return reassigned;
  }
}
