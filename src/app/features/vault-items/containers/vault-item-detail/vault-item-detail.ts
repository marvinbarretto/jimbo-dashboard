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
import { VaultItemsService } from '../../data-access/vault-items.service';
import { VaultItemDetailBody } from '../../components/vault-item-detail-body/vault-item-detail-body';

@Component({
  selector: 'app-vault-item-detail',
  imports: [VaultItemDetailBody, RouterLink],
  template: `
    @if (seq(); as s) {
      <app-vault-item-detail-body [seq]="s" mode="page" />
    } @else {
      <div class="vault-item-not-found">
        <a routerLink="/vault-items" class="back-link">← Vault</a>
        <p>Item not found.</p>
      </div>
    }
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
