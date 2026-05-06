import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Dialog, type DialogRef } from '@angular/cdk/dialog';
import { SearchDialog } from '@features/search/search-dialog';
import { CaptureDialog } from '@features/capture/capture-dialog';

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
    if (e.key === 'c' && !isTextTarget(e.target as Element)) {
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

  openCapture(): void {
    if (this.captureOpen) return;
    this.captureOpen = true;
    const ref = this.dialog.open(CaptureDialog, {
      panelClass: 'command-dialog',
      ariaModal: true,
      autoFocus: 'first-tabbable',
      restoreFocus: true,
      hasBackdrop: true,
    });
    ref.closed.subscribe(() => { this.captureOpen = false; });
  }
}
