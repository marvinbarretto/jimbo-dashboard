import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import type { VaultItem } from '@domain/vault/vault-item';

@Component({
  selector: 'app-vault-item-identity-header',
  imports: [UiBadge],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="vault-item-identity-header">
      <span class="vault-item-identity-header__seq">#{{ item().seq }}</span>
      <app-ui-badge tone="info" [subtle]="true">{{ item().type }}</app-ui-badge>
      <h1 class="vault-item-identity-header__title">{{ item().title }}</h1>
    </header>
  `,
  styles: [`
    :host {
      display: block;
    }

    .vault-item-identity-header {
      display: flex;
      gap: 0.55rem;
      align-items: center;
      flex-wrap: wrap;
      padding: 0.85rem 0.9rem 0.7rem;
      border-bottom: 1px solid color-mix(in srgb, var(--color-border) 92%, transparent);
      background:
        linear-gradient(180deg,
          color-mix(in srgb, var(--color-surface-raised) 55%, transparent),
          color-mix(in srgb, var(--color-surface) 95%, transparent));
    }

    .vault-item-identity-header__seq {
      opacity: 0.72;
      font-family: var(--font-mono, monospace);
      font-size: 0.74rem;
      color: var(--color-text-soft);
    }

    .vault-item-identity-header__title {
      margin: 0;
      font-size: 1.02rem;
      font-weight: 650;
      letter-spacing: -0.01em;
      flex: 1;
      min-width: min(24rem, 100%);
    }
  `],
})
export class VaultItemIdentityHeader {
  readonly item = input.required<VaultItem>();
}
