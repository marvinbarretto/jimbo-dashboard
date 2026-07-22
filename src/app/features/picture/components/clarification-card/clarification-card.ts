import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import type { Clarification } from '@domain/clarifications';
import { AnswerRail } from '@shared/components/answer-rail/answer-rail';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { TagChip } from '@shared/components/tag-chip/tag-chip';
import { UiMetaList } from '@shared/components/ui-meta-list/ui-meta-list';
import { UiProse } from '@shared/components/ui-prose/ui-prose';
import { relativeTime } from '@shared/utils/datetime.utils';
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
  imports: [UiBadge, TagChip, UiMetaList, UiProse, AnswerRail],
  templateUrl: './clarification-card.html',
  styleUrl: './clarification-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClarificationCard {
  readonly clarification = input.required<Clarification>();
  // Set by ClarificationsTab when this card is the target of a
  // ?clarification=<id> deep-link (e.g. from a Context item's source link).
  readonly highlighted = input<boolean>(false);

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
