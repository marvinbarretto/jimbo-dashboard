import { effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Dialog, type DialogRef } from '@angular/cdk/dialog';
import { distinctUntilChanged, map } from 'rxjs';
import { VaultItemDetailDialog } from '@features/vault-items/containers/vault-item-detail-dialog/vault-item-detail-dialog';
import type { VaultItemDialogData } from '@features/vault-items/dialog/vault-item-dialog-mode';

// Re-export so callers that only need navigation helpers can import from
// detail-modal without pulling in VaultItemDetailDialog. The canonical
// implementations live in detail-nav.ts to break the circular dependency
// that would otherwise form: detail-modal → VaultItemDetailDialog →
// VaultItemDetailBody → detail-modal.
export { swapDetailSeq, closeDetail } from './detail-nav';

// Wires `?detail=<seq>` ↔ a CDK Dialog of the vault-item detail. Call once
// from a kanban board's constructor; the URL becomes the single source of
// truth for whether the dialog is open.
//
// - param present → dialog open
// - param cleared → dialog closes
// - close from inside the dialog (ESC, backdrop, close button) → param cleared
//
// `?note=<seq>` is accepted as a synonym for `?detail=<seq>` — external
// notifiers (activity-watcher Telegram pager, future webhook senders) can
// link to a note without knowing the dashboard's internal modal vocabulary.
// `?detail=` wins when both are present.
//
// Distinct from a directive on purpose: matches the existing kanban composable
// pattern in `shared/kanban/` (drag-state, filter-state). Boards opt in with
// one line; nothing else changes about how they read or write the URL.
export function withVaultDetailModal(): void {
  const dialog = inject(Dialog);
  const route = inject(ActivatedRoute);
  const router = inject(Router);

  const detailSeq = toSignal(
    route.queryParamMap.pipe(
      map(p => {
        const raw = p.get('detail') ?? p.get('note');
        if (!raw) return null;
        const n = Number(raw);
        return Number.isNaN(n) ? null : n;
      }),
      distinctUntilChanged(),
    ),
    { initialValue: null },
  );

  let ref: DialogRef<unknown> | null = null;

  effect(() => {
    const seq = detailSeq();

    if (seq === null) {
      // URL cleared the param — make sure any open dialog closes.
      if (ref) {
        const r = ref;
        ref = null;
        r.close();
      }
      return;
    }

    if (ref) {
      // seq changed while dialog is open — close the current one and fall
      // through to reopen with the new seq. This is what makes swapDetailSeq()
      // work: the URL param changes, we get a new seq value, and we swap the
      // dialog body by closing + reopening rather than mutating static DIALOG_DATA.
      const r = ref;
      ref = null;
      r.close();
    }

    const opened: DialogRef<unknown> = dialog.open<unknown, VaultItemDialogData>(
      VaultItemDetailDialog,
      {
        data: { kind: 'item', seq },
        ariaModal: true,
        autoFocus: 'first-tabbable',
        restoreFocus: true,
        hasBackdrop: true,
        disableClose: false,
        // `--item` pins a stable height so switching Detail/Activity/Thread
        // tabs doesn't resize the modal (body scrolls internally). Draft mode
        // opens with the base class only — its compact form shouldn't be
        // stretched into a tall empty panel.
        panelClass: ['vault-detail-dialog', 'vault-detail-dialog--item'],
      },
    );
    ref = opened;

    opened.closed.subscribe(() => {
      // If the close was triggered by the URL clearing (param-cleared branch
      // above nulled `ref` before calling close()), we don't need to write
      // the URL again — would just churn router state.
      const wasFromUrl = ref === null;
      ref = null;
      if (wasFromUrl) return;
      router.navigate([], {
        relativeTo: route,
        queryParams: { detail: null, note: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    });
  });
}
