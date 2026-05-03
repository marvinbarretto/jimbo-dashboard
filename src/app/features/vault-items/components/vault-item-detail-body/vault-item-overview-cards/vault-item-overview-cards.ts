import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { UiStatCard } from '@shared/components/ui-stat-card/ui-stat-card';

export interface VaultItemSummary {
  readonly label: string;
  readonly value: string;
  readonly detail: string;
}

@Component({
  selector: 'app-vault-item-overview-cards',
  imports: [UiStatCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="vault-item-overview-cards" aria-label="Item overview">
      <app-ui-stat-card
        [label]="source().label"
        [value]="source().value"
        [detail]="source().detail"
      />
      <app-ui-stat-card
        [label]="hierarchy().label"
        [value]="hierarchy().value"
        [detail]="hierarchy().detail"
      />
      <app-ui-stat-card
        [label]="timeline().label"
        [value]="timeline().value"
        [detail]="timeline().detail"
      />
      <app-ui-stat-card
        [label]="queue().label"
        [value]="queue().value"
        [detail]="queue().detail"
      />
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .vault-item-overview-cards {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.6rem;
      margin-top: 0.8rem;
    }

    @media (max-width: 768px) {
      .vault-item-overview-cards {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class VaultItemOverviewCards {
  readonly source = input.required<VaultItemSummary>();
  readonly hierarchy = input.required<VaultItemSummary>();
  readonly timeline = input.required<VaultItemSummary>();
  readonly queue = input.required<VaultItemSummary>();
}
