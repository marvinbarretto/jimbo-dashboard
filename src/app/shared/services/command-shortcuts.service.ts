import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Dialog, type DialogRef } from '@angular/cdk/dialog';
import { SearchDialog } from '@features/search/search-dialog';
import { VaultItemDetailDialog } from '@features/vault-items/containers/vault-item-detail-dialog/vault-item-detail-dialog';
import type { VaultItemDialogData } from '@features/vault-items/dialog/vault-item-dialog-mode';

function isTextTarget(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select'
    || (el as HTMLElement).isContentEditable;
}

@Injectable({ providedIn: 'root' })
export class CommandShortcutsService {
  private readonly dialog = inject(Dialog);
  private readonly doc = inject(DOCUMENT);

  private searchOpen = false;
  private captureOpen = false;

  constructor() {
    this.doc.addEventListener('keydown', (e: KeyboardEvent) => this.onKey(e));
  }

  private onKey(e: KeyboardEvent): void {
    if (e.shiftKey && e.key === 'N' && !isTextTarget(e.target as Element)) {
      e.preventDefault();
      this.openCapture();
      return;
    }
    if (e.key === '/' && !isTextTarget(e.target as Element)) {
      e.preventDefault();
      this.openSearch();
    }
  }

  openSearch(): void {
    if (this.searchOpen) return;
    this.searchOpen = true;
    const ref = this.dialog.open(SearchDialog, {
      panelClass: 'command-dialog',
      ariaModal: true,
      autoFocus: 'first-tabbable',
      restoreFocus: true,
      hasBackdrop: true,
    });
    ref.closed.subscribe(() => { this.searchOpen = false; });
  }

  /**
   * Opens the unified vault-item dialog in Draft mode. Replaces the old
   * standalone CaptureDialog — the dialog morphs Draft → Item in-place
   * after save, letting the operator keep editing without a reopen.
   */
  openCapture(): void {
    if (this.captureOpen) return;
    this.captureOpen = true;
    const ref: DialogRef<unknown> = this.dialog.open<unknown, VaultItemDialogData>(
      VaultItemDetailDialog,
      {
        data: { kind: 'draft' },
        panelClass: 'vault-detail-dialog',
        ariaModal: true,
        autoFocus: 'first-tabbable',
        restoreFocus: true,
        hasBackdrop: true,
      },
    );
    ref.closed.subscribe(() => { this.captureOpen = false; });
  }
}
