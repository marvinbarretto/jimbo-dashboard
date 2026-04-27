import { effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { Dialog, type DialogRef } from '@angular/cdk/dialog';
import { distinctUntilChanged, map } from 'rxjs';
import {
  VaultItemDetailDialog,
  type VaultItemDetailDialogData,
} from '@features/vault-items/containers/vault-item-detail-dialog/vault-item-detail-dialog';

// Swaps the modal contents to a different vault item by updating the
// `?detail=<seq>` query param. withVaultDetailModal() watches this param and
// re-binds the dialog body when it changes.
export function swapDetailSeq(router: Router, seq: number): void {
  router.navigate([], {
    queryParams: { detail: seq },
    queryParamsHandling: 'merge',
  });
}

// Close the modal by clearing the `?detail=` query param. The
// withVaultDetailModal() observer reacts to the param disappearing and
// closes the dialog. No-op for `mode === 'page'` callers (they should
// use Router.navigate to /vault-items instead).
export function closeDetail(router: Router): void {
  router.navigate([], {
    queryParams: { detail: null },
    queryParamsHandling: 'merge',
    replaceUrl: true,
  });
}

// Wires `?detail=<seq>` ↔ a CDK Dialog of the vault-item detail. Call once
// from a kanban board's constructor; the URL becomes the single source of
// truth for whether the dialog is open.
//
// - param present → dialog open
// - param cleared → dialog closes
// - close from inside the dialog (ESC, backdrop, close button) → param cleared
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
        const raw = p.get('detail');
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

    const opened: DialogRef<unknown> = dialog.open<unknown, VaultItemDetailDialogData>(
      VaultItemDetailDialog,
      {
        data: { seq },
        ariaModal: true,
        autoFocus: 'first-tabbable',
        restoreFocus: true,
        hasBackdrop: true,
        disableClose: false,
        panelClass: 'vault-detail-dialog',
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
        queryParams: { detail: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    });
  });
}
