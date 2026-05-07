import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { VaultItemsService } from '../../data-access/vault-items.service';
import { VaultItemDetailBody } from '../../components/vault-item-detail-body/vault-item-detail-body';
import { ModalShell } from '@shared/components/modal-shell/modal-shell';
import {
  type DialogMode,
  type VaultItemDialogData,
  initialMode,
  isDraft,
  isItem,
} from '../../dialog/vault-item-dialog-mode';
import { VaultItemDialogStore } from '../../dialog/vault-item-dialog-store';

@Component({
  selector: 'app-vault-item-detail-dialog',
  imports: [VaultItemDetailBody, ModalShell],
  // Component-scoped store — one per dialog instance. The body component
  // injects the same instance via Angular's hierarchical DI.
  providers: [VaultItemDialogStore],
  templateUrl: './vault-item-detail-dialog.html',
  styleUrl: './vault-item-detail-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VaultItemDetailDialog {
  protected readonly data = inject<VaultItemDialogData>(DIALOG_DATA);
  private readonly dialogRef = inject<DialogRef<unknown, VaultItemDialogData>>(DialogRef);
  private readonly vaultItemsService = inject(VaultItemsService);

  /** Single source of truth for the dialog's lifecycle state. */
  protected readonly mode = signal<DialogMode>(initialMode(this.data));

  // Stable id for aria-labelledby binding on the dialog host. Computed once
  // from the initial data; doesn't need to change when Draft → Item morphs.
  protected readonly titleId = (() => {
    if (this.data.kind === 'item') return `vault-detail-dialog-title-${this.data.seq}`;
    return 'vault-detail-dialog-title-draft';
  })();

  // Headline shown in the modal header. For items, falls back to "#<seq>"
  // while the row resolves; for drafts shows "New item".
  // Chrome shows only the seq — the full title is inline-editable in the body.
  protected readonly headline = computed(() => {
    const m = this.mode();
    if (isDraft(m)) return 'New item';
    if (isItem(m)) return `#${m.seq}`;
    return '';
  });

  onClose(): void { this.dialogRef.close(); }

  onModeChange(next: DialogMode): void {
    // Draft → Item transition fires when createWithRelations resolves.
    // Update local mode signal so the layout swaps without unmounting.
    this.mode.set(next);
  }
}
