import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { VaultItemsService } from '../../data-access/vault-items.service';
import { VaultItemDetailBody } from '../../components/vault-item-detail-body/vault-item-detail-body';
import { ModalShell } from '@shared/components/modal-shell/modal-shell';

export interface VaultItemDetailDialogData {
  seq: number;
}

@Component({
  selector: 'app-vault-item-detail-dialog',
  imports: [VaultItemDetailBody, ModalShell],
  templateUrl: './vault-item-detail-dialog.html',
  styleUrl: './vault-item-detail-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VaultItemDetailDialog {
  protected readonly data = inject<VaultItemDetailDialogData>(DIALOG_DATA);
  private readonly dialogRef = inject<DialogRef<unknown, VaultItemDetailDialogData>>(DialogRef);
  private readonly vaultItemsService = inject(VaultItemsService);

  protected readonly seq = computed(() => this.data.seq);

  // Stable id for aria-labelledby binding on the dialog host.
  protected readonly titleId = `vault-detail-dialog-title-${this.data.seq}`;

  // Headline shown in the modal header — falls back to "#<seq>" while item resolves.
  protected readonly headline = computed(() => {
    const item = this.vaultItemsService.getBySeq(this.data.seq);
    return item ? `#${item.seq} · ${item.title}` : `#${this.data.seq}`;
  });

  onClose(): void { this.dialogRef.close(); }
}
