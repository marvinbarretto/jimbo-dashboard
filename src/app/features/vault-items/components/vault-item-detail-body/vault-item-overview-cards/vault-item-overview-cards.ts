import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export interface VaultItemSummary {
  readonly label: string;
  readonly value: string;
  readonly detail: string;
}

@Component({
  selector: 'app-vault-item-overview-cards',
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dl class="vault-item-meta-strip" aria-label="Item overview">
      <span class="vault-item-meta-strip__pair">
        <dt>{{ source().label }}</dt>
        <dd>{{ source().value }}</dd>
      </span>
      <span class="vault-item-meta-strip__sep" aria-hidden="true">·</span>
      <span class="vault-item-meta-strip__pair">
        <dt>{{ hierarchy().label }}</dt>
        <dd>{{ hierarchy().value }}</dd>
      </span>
      <span class="vault-item-meta-strip__sep" aria-hidden="true">·</span>
      <span class="vault-item-meta-strip__pair">
        <dt>{{ queue().label }}</dt>
        <dd>{{ queue().detail }}</dd>
      </span>
    </dl>
  `,
  styles: [`
    :host { display: block; }

    .vault-item-meta-strip {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.25rem 0.4rem;
      margin: 0.4rem 0 0;
      padding: 0;
      font-size: 0.68rem;
      color: var(--color-text-muted);
      line-height: 1.4;
    }

    .vault-item-meta-strip__pair {
      display: inline-flex;
      gap: 0.25rem;

      dt {
        font-weight: 600;
        color: var(--color-text-soft, var(--color-text-muted));
        text-transform: uppercase;
        font-size: 0.6rem;
        letter-spacing: 0.06em;
      }

      dd {
        margin: 0;
        color: var(--color-text);
      }
    }

    .vault-item-meta-strip__sep {
      color: var(--color-border);
      user-select: none;
    }
  `],
})
export class VaultItemOverviewCards {
  readonly source = input.required<VaultItemSummary>();
  readonly hierarchy = input.required<VaultItemSummary>();
  // timeline omitted — already shown by vault-item-meta-line
  readonly queue = input.required<VaultItemSummary>();
}
