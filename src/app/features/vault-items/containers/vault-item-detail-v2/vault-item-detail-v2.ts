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
import { VaultItemDetailBodyV2 } from '../../components/vault-item-detail-body-v2/vault-item-detail-body-v2';
import type { DialogMode } from '../../dialog/vault-item-dialog-mode';
import { VaultItemDialogStore } from '../../dialog/vault-item-dialog-store';

/**
 * Page host for the #10 tabbed redesign — a sibling of {@link VaultItemDetail}
 * mounted at `/vault-items/<seq>/v2` so the new layout can be compared
 * side-by-side with the current one on the same real data. Identical wiring:
 * provides a component-scoped store, resolves seq from the route, and renders
 * the body in `surface="page"`. Only the body component differs.
 */
@Component({
  selector: 'app-vault-item-detail-v2',
  imports: [VaultItemDetailBodyV2, RouterLink, UiPage],
  providers: [VaultItemDialogStore],
  template: `
    <app-ui-page width="standard">
    @if (mode(); as m) {
      <app-vault-item-detail-body-v2 [mode]="m" surface="page" />
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
export class VaultItemDetailV2 {
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

  readonly mode = computed<DialogMode | null>(() => {
    const s = this.seq();
    return s == null ? null : { kind: 'item', seq: s, stage: 'mature' };
  });

  private readonly resolvedItem = computed(() => {
    const s = this.seq();
    return s !== null && s !== undefined ? this.vaultItemsService.getBySeq(s) : undefined;
  });

  constructor() {
    effect(() => {
      const i = this.resolvedItem();
      if (!i) return;
      this.titleService.setTitle(formatPageTitle(`#${i.seq} ${i.title} · v2`));
    });
  }
}
