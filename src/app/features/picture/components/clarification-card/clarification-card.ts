import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import type { Clarification } from '@domain/clarifications';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { TagChip } from '@shared/components/tag-chip/tag-chip';
import { UiMetaList } from '@shared/components/ui-meta-list/ui-meta-list';
import { relativeTime } from '@shared/utils/datetime.utils';
import { ClarificationAnswerComposer } from '../clarification-answer-composer/clarification-answer-composer';
import { formatInterpretedAction } from '../../util/interpreted-action.format';

type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

const STATUS_TONE: Record<Clarification['status'], BadgeTone> = {
  open: 'info',
  answered: 'success',
  dismissed: 'neutral',
  expired: 'warning',
};

@Component({
  selector: 'app-clarification-card',
  imports: [UiBadge, TagChip, UiMetaList, ClarificationAnswerComposer],
  templateUrl: './clarification-card.html',
  styleUrl: './clarification-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClarificationCard {
  readonly clarification = input.required<Clarification>();

  readonly dismissed = output<string>();
  readonly answered = output<{ id: string; text: string }>();

  readonly showAnswer = signal(false);

  readonly statusTone = computed(() => STATUS_TONE[this.clarification().status]);
  readonly askedLabel = computed(() => relativeTime(this.clarification().asked_at));

  readonly result = computed(() => {
    const action = this.clarification().interpreted_action;
    return action ? formatInterpretedAction(action) : null;
  });

  toggleAnswer(): void {
    this.showAnswer.update(v => !v);
  }

  onAnswerPosted(text: string): void {
    this.answered.emit({ id: this.clarification().id, text });
    this.showAnswer.set(false);
  }

  onDismiss(): void {
    this.dismissed.emit(this.clarification().id);
  }
}
