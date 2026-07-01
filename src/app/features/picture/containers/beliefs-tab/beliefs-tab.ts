import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import type { AnyInterrogateEntity, BeliefEntity, InterrogateEntityType } from '@domain/interrogate';
import { normalizeBeliefEntity } from '@domain/interrogate';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { InterrogateSnapshotService } from '../../data-access/interrogate-snapshot.service';
import { InterrogateEntityService } from '../../data-access/interrogate-entity.service';
import { InterrogateProposalsService } from '../../data-access/interrogate-proposals.service';
import { BeliefCard, type BeliefEdit, type BeliefFeedbackEvent } from '../../components/belief-card/belief-card';
import { ProposalReviewCard } from '../../components/proposal-review-card/proposal-review-card';

@Component({
  selector: 'app-beliefs-tab',
  imports: [UiSection, UiLoadingState, UiEmptyState, BeliefCard, ProposalReviewCard],
  templateUrl: './beliefs-tab.html',
  styleUrl: './beliefs-tab.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BeliefsTab {
  private readonly snapshotService = inject(InterrogateSnapshotService);
  private readonly entityService = inject(InterrogateEntityService);
  private readonly proposalsService = inject(InterrogateProposalsService);

  readonly loading = this.snapshotService.loading;
  readonly pendingProposals = this.proposalsService.pending;

  readonly valueEntities = computed(() => this.activeOnly('value', this.snapshotService.values()));
  readonly priorityEntities = computed(() => this.activeOnly('priority', this.snapshotService.priorities()));
  readonly goalEntities = computed(() => this.activeOnly('goal', this.snapshotService.goals()));
  readonly interestEntities = computed(() => this.activeOnly('interest', this.snapshotService.interests()));
  readonly experimentEntities = computed(() => this.activeOnly('experiment', this.snapshotService.experiments()));
  readonly nogoEntities = computed(() => this.activeOnly('nogo', this.snapshotService.nogos()));
  readonly tensionEntities = computed(() => this.activeOnly('tension', this.snapshotService.tensions()));
  readonly openQuestionEntities = computed(() => this.activeOnly('open_question', this.snapshotService.openQuestions()));

  constructor() {
    // Snapshot is loaded once by PicturePage (shared with the Context tab);
    // this tab only owns the pending-proposals fetch.
    this.proposalsService.loadPending();
  }

  onEdited(edit: BeliefEdit): void {
    this.entityService.update(edit.entityType, edit.id, { content: edit.content });
  }

  onFeedback(feedback: BeliefFeedbackEvent): void {
    this.entityService.addEvidence(feedback.entityType, feedback.id, feedback.stance, feedback.snippet);
  }

  onProposalDecided(event: { id: number; decision: 'accept' | 'reject' }): void {
    this.proposalsService.decide(event.id, event.decision);
  }

  private activeOnly<T extends { status: string }>(type: InterrogateEntityType, raw: readonly T[]): BeliefEntity[] {
    return raw
      .filter(e => e.status === 'active')
      .map(e => normalizeBeliefEntity(type, e as unknown as AnyInterrogateEntity));
  }
}
