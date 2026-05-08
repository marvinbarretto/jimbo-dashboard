import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import type { VaultItem } from '@domain/vault/vault-item';

@Component({
  selector: 'app-actor-vault-item-row',
  imports: [RouterLink, UiBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a [routerLink]="['/vault-items', item().seq]" class="actor-vault-item-row">
      <span class="actor-vault-item-row__seq">#{{ item().seq }}</span>
      <span class="actor-vault-item-row__title">{{ item().title }}</span>
      <app-ui-badge tone="info" [subtle]="true">{{ item().grooming_status }}</app-ui-badge>
    </a>
  `,
  styles: [`
    .actor-vault-item-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.4rem 0;
      text-decoration: none;
      color: inherit;
    }
    .actor-vault-item-row:hover .actor-vault-item-row__title {
      text-decoration: underline;
    }
    .actor-vault-item-row__seq {
      font-size: 0.75rem;
      color: var(--color-text-muted);
      min-width: 3rem;
    }
    .actor-vault-item-row__title {
      flex: 1;
      font-size: 0.875rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `],
})
export class ActorVaultItemRow {
  readonly item = input.required<VaultItem>();
}
