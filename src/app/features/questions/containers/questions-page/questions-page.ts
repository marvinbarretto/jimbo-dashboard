import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CURRENT_ACTOR_ID } from '@domain/actors';
import { ThreadCommands } from '@features/thread/commands/thread-commands';
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
  private readonly threadCommands   = inject(ThreadCommands);

  readonly loading   = this.questionsService.loading;
  readonly sortOrder = signal<SortOrder>('newest');
  readonly currentActorId = CURRENT_ACTOR_ID;

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
    this.threadCommands.answerQuestion(payload);
  }
}
