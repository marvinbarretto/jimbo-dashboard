import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { actorId } from '@domain/ids';
import { ThreadService } from '@features/thread/data-access/thread.service';
import { QuestionsService } from '../../data-access/questions.service';
import { QuestionCard } from '../../components/question-card/question-card';
import type { CreateThreadMessagePayload } from '@domain/thread';

type SortOrder = 'newest' | 'oldest';

@Component({
  selector: 'app-questions-page',
  imports: [QuestionCard],
  templateUrl: './questions-page.html',
  styleUrl: './questions-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionsPage implements OnInit {
  private readonly questionsService = inject(QuestionsService);
  private readonly threadService    = inject(ThreadService);

  readonly loading   = this.questionsService.loading;
  readonly sortOrder = signal<SortOrder>('newest');
  readonly currentActorId = actorId('marvin');

  readonly questions = computed(() => {
    const qs = this.questionsService.openQuestions();
    return this.sortOrder() === 'oldest'
      ? [...qs].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      : qs;
  });

  ngOnInit(): void {
    this.questionsService.load(this.currentActorId);
  }

  setSort(order: SortOrder): void { this.sortOrder.set(order); }

  onAnswered(payload: CreateThreadMessagePayload): void {
    this.threadService.post(payload);
    if (payload.in_reply_to) {
      this.questionsService.markAnswered(payload.in_reply_to, payload.id);
    }
  }
}
