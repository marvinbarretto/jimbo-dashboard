import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import type { InterrogateProposal } from '@domain/interrogate';
import { ENTITY_TYPE_LABEL } from '@domain/interrogate';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { UiProse } from '@shared/components/ui-prose/ui-prose';

// Accept/reject only for v1 — proposal payloads vary per action type
// (create/update/archive/adjust_confidence), so a generic "edit the payload"
// UI is a bigger piece of work than the pending-proposal review this card
// is scoped to. Editing before applying can still be done later via the
// existing PATCH /api/interrogate/proposals/{id} { decision: 'edit' } path.
@Component({
  selector: 'app-proposal-review-card',
  imports: [DecimalPipe, UiBadge, UiProse],
  templateUrl: './proposal-review-card.html',
  styleUrl: './proposal-review-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProposalReviewCard {
  readonly proposal = input.required<InterrogateProposal>();

  readonly decided = output<{ id: number; decision: 'accept' | 'reject' }>();

  readonly entityLabel = computed(() => ENTITY_TYPE_LABEL[this.proposal().entity_type]);
  readonly payloadJson = computed(() => JSON.stringify(this.proposal().payload, null, 2));

  accept(): void {
    this.decided.emit({ id: this.proposal().id, decision: 'accept' });
  }

  reject(): void {
    this.decided.emit({ id: this.proposal().id, decision: 'reject' });
  }
}
