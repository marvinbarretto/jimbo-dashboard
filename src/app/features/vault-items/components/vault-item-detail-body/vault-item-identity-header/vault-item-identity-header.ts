import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { UiInlineEdit } from '@shared/components/ui-inline-edit/ui-inline-edit';
import type { VaultItem } from '@domain/vault/vault-item';

@Component({
  selector: 'app-vault-item-identity-header',
  imports: [UiBadge, UiInlineEdit],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="vault-item-identity-header">
      <span class="vault-item-identity-header__seq">#{{ item().seq }}</span>
      @if (item().is_epic) {
        <app-ui-badge tone="accent">EPIC</app-ui-badge>
      } @else {
        <app-ui-badge tone="info" [subtle]="true">{{ item().type }}</app-ui-badge>
      }
      <app-ui-inline-edit
        class="vault-item-identity-header__title"
        [value]="item().title"
        size="lg"
        ariaLabel="Edit title"
        (saved)="onSaved($event)"
      />
    </header>
  `,
  styles: [`
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
      flex: 1;
      min-width: min(24rem, 100%);
    }
  `],
})
export class VaultItemIdentityHeader {
  readonly item = input.required<VaultItem>();
  readonly titleChange = output<string>();

  // Trim host-side; a whitespace-only edit collapses to no-change.
  onSaved(next: string): void {
    const trimmed = next.trim();
    if (trimmed && trimmed !== this.item().title) this.titleChange.emit(trimmed);
  }
}
