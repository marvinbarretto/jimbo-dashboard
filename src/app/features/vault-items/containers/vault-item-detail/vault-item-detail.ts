import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { formatPageTitle } from '@app/app-title-strategy';
import { UiPage } from '@shared/components/ui-page/ui-page';
import { VaultItemsService } from '../../data-access/vault-items.service';
import { VaultItemDetailBody } from '../../components/vault-item-detail-body/vault-item-detail-body';
import type { DialogMode } from '../../dialog/vault-item-dialog-mode';
import { VaultItemDialogStore } from '../../dialog/vault-item-dialog-store';

@Component({
  selector: 'app-vault-item-detail',
  imports: [VaultItemDetailBody, RouterLink, UiPage],
  // Component-scoped store, one per page navigation. Body component shares
  // the instance via hierarchical DI.
  providers: [VaultItemDialogStore],
  template: `
    <app-ui-page width="standard">
    @if (mode(); as m) {
      <app-vault-item-detail-body [mode]="m" surface="page" />
    } @else {
      <div class="vault-item-not-found">
        <a routerLink="/vault-items" class="back-link">← Vault</a>
        <p>Item not found.</p>
      </div>
    }
    </app-ui-page>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VaultItemDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly vaultItemsService = inject(VaultItemsService);
  private readonly titleService = inject(Title);

  readonly seq = toSignal(
    this.route.paramMap.pipe(map(p => {
      const raw = p.get('seq');
      const n = raw ? Number(raw) : NaN;
      return isNaN(n) ? null : n;
    }))
  );

  // The page route is always Item-mode — Draft is reachable only via the
  // command shortcut / unified dialog (no /vault-items/draft URL).
  readonly mode = computed<DialogMode | null>(() => {
    const s = this.seq();
    return s == null ? null : { kind: 'item', seq: s, stage: 'mature' };
  });

  // Title management lives on the page route only — opening a modal does not
  // mutate <title> because the page underneath is still the kanban.
  private readonly resolvedItem = computed(() => {
    const s = this.seq();
    return s !== null && s !== undefined ? this.vaultItemsService.getBySeq(s) : undefined;
  });

  constructor() {
    effect(() => {
      const i = this.resolvedItem();
      if (!i) return;
      this.titleService.setTitle(formatPageTitle(`#${i.seq} ${i.title}`));
    });
  }
}
