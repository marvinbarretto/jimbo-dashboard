import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { UiChecklist, type UiChecklistItem } from '@shared/components/ui-checklist/ui-checklist';
import { UiReadinessPanel, type UiReadinessData } from '@shared/components/ui-readiness-panel/ui-readiness-panel';
import { UiSubhead } from '@shared/components/ui-subhead/ui-subhead';
import { UiSubsection } from '@shared/components/ui-subsection/ui-subsection';
import type { AcceptanceCriterion } from '@domain/vault/vault-item';
import { acceptanceCriterionStatus } from '@shared/validation/acceptance-criterion-length';

@Component({
  selector: 'app-vault-item-delivery-block',
  imports: [UiChecklist, UiReadinessPanel, UiSubhead, UiSubsection],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-ui-subsection label="Delivery">
      @if (readiness(); as r) {
        <app-ui-readiness-panel [data]="r" />
      }

      <app-ui-subhead label="Acceptance criteria" [count]="criteria().length" />
      @if (criteria().length > 0) {
        <app-ui-checklist [items]="checklistItems()" />
      } @else {
        <div class="vault-item-delivery-block__empty">No acceptance criteria yet — blocks readiness</div>
      }
    </app-ui-subsection>
  `,
  styles: [`
    :host {
      display: block;
      min-width: 0;
    }

    .vault-item-delivery-block__empty {
      padding: 0.4rem 0.6rem;
      background: #fbe7e7;
      border: 1px dashed #a33;
      color: #a33;
      font-size: 0.7rem;
    }
  `],
})
export class VaultItemDeliveryBlock {
  readonly readiness = input<UiReadinessData | undefined>(undefined);
  readonly criteria = input.required<readonly AcceptanceCriterion[]>();

  readonly checklistItems = computed<readonly UiChecklistItem[]>(() =>
    this.criteria().map(ac => {
      const status = acceptanceCriterionStatus(ac.text);
      if (status === 'verbose') {
        return {
          text: ac.text,
          done: ac.done,
          status: {
            label: 'verbose',
            tone: 'warn',
            title: `Verbose (${ac.text.length} chars). Spec recommends ≤ 120.`,
          },
        };
      }
      if (status === 'exceeds') {
        return {
          text: ac.text,
          done: ac.done,
          status: {
            label: 'exceeds',
            tone: 'err',
            title: `Exceeds policy (${ac.text.length} chars). Reject or edit.`,
          },
        };
      }
      return { text: ac.text, done: ac.done };
    })
  );
}
