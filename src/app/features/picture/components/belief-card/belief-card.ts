import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import type { BeliefEntity, EvidenceStance, InterrogateEvidence } from '@domain/interrogate';
import type { InterrogateEntityId } from '@domain/ids';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { UiProse } from '@shared/components/ui-prose/ui-prose';
import { relativeTime } from '@shared/utils/datetime.utils';
import { INTERROGATE_ENTITY_READ } from '../../data-access/interrogate-entity.read';
import { BeliefFeedbackComposer, type BeliefFeedback } from '../belief-feedback-composer/belief-feedback-composer';

type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

function confidenceTone(confidence: number): BadgeTone {
  if (confidence >= 0.7) return 'success';
  if (confidence >= 0.4) return 'warning';
  return 'danger';
}

export interface BeliefEdit {
  entityType: BeliefEntity['entityType'];
  id: InterrogateEntityId;
  content: string;
}

export interface BeliefFeedbackEvent {
  entityType: BeliefEntity['entityType'];
  id: InterrogateEntityId;
  stance: EvidenceStance;
  snippet?: string;
}

@Component({
  selector: 'app-belief-card',
  imports: [ReactiveFormsModule, DatePipe, UiBadge, UiProse, BeliefFeedbackComposer],
  templateUrl: './belief-card.html',
  styleUrl: './belief-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BeliefCard {
  private readonly entityService = inject(INTERROGATE_ENTITY_READ);

  readonly entity = input.required<BeliefEntity>();

  readonly edited = output<BeliefEdit>();
  readonly feedbackGiven = output<BeliefFeedbackEvent>();

  readonly editing = signal(false);
  readonly showFeedback = signal(false);
  readonly showHistory = signal(false);
  readonly historyLoaded = signal(false);
  readonly history = signal<InterrogateEvidence[]>([]);

  readonly editControl = new FormControl('', { nonNullable: true, validators: [Validators.required] });

  readonly confidencePct = computed(() => Math.round(this.entity().confidence * 100));
  readonly confidenceTone = computed(() => confidenceTone(this.entity().confidence));
  readonly reviewedLabel = computed(() => relativeTime(this.entity().last_reviewed_at));

  startEdit(): void {
    this.editControl.setValue(this.entity().content);
    this.editing.set(true);
  }

  cancelEdit(): void {
    this.editing.set(false);
  }

  saveEdit(): void {
    const value = this.editControl.value.trim();
    if (!this.editControl.valid || !value) return;
    this.edited.emit({ entityType: this.entity().entityType, id: this.entity().id, content: value });
    this.editing.set(false);
  }

  toggleFeedback(): void {
    this.showFeedback.update(v => !v);
  }

  onFeedback(feedback: BeliefFeedback): void {
    this.feedbackGiven.emit({
      entityType: this.entity().entityType,
      id: this.entity().id,
      stance: feedback.stance,
      snippet: feedback.snippet,
    });
    this.showFeedback.set(false);
  }

  toggleHistory(): void {
    this.showHistory.update(v => !v);
    if (this.showHistory() && !this.historyLoaded()) {
      this.entityService.listEvidence(this.entity().entityType, this.entity().id).subscribe(({ evidence }) => {
        this.history.set(evidence);
        this.historyLoaded.set(true);
      });
    }
  }
}
