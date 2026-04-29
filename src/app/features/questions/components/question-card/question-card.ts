import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { OpenQuestionView, CreateThreadMessagePayload } from '@domain/thread';
import { actorId } from '@domain/ids';
import { ActorsService } from '@features/actors/data-access/actors.service';
import { QuestionReplyComposer } from '@shared/components/question-reply-composer/question-reply-composer';

@Component({
  selector: 'app-question-card',
  imports: [RouterLink, QuestionReplyComposer],
  templateUrl: './question-card.html',
  styleUrl: './question-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionCard {
  readonly question = input.required<OpenQuestionView>();
  readonly answered  = output<CreateThreadMessagePayload>();

  private readonly actorsService = inject(ActorsService);

  readonly showReply = signal(false);
  readonly currentActorId = actorId('marvin');

  readonly authorLabel = computed(() => {
    const a = this.actorsService.getById(this.question().author_actor_id);
    return a ? `@${a.id}` : `@${this.question().author_actor_id}`;
  });

  readonly authorKind = computed(() => {
    return this.actorsService.getById(this.question().author_actor_id)?.kind ?? 'system';
  });

  // Synthetic ThreadMessage shape required by QuestionReplyComposer
  readonly asThreadMessage = computed(() => ({
    id: this.question().id,
    vault_item_id: this.question().vault_item_id,
    author_actor_id: this.question().author_actor_id,
    kind: 'question' as const,
    body: this.question().body,
    in_reply_to: this.question().in_reply_to,
    answered_by: null,
    created_at: this.question().created_at,
  }));

  readonly ageLabel = computed(() => {
    const d = Math.floor(this.question().age_days);
    if (d <= 0) return 'today';
    if (d === 1) return '1d ago';
    return `${d}d ago`;
  });

  toggleReply(): void { this.showReply.update(v => !v); }

  onReplyPosted(payload: CreateThreadMessagePayload): void {
    this.answered.emit(payload);
    this.showReply.set(false);
  }
}
