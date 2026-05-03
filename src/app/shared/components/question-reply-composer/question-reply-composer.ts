import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import type { ThreadMessage, CreateThreadMessagePayload } from '@domain/thread';
import type { VaultItemId, ActorId, ThreadMessageId } from '@domain/ids';
import { threadMessageId } from '@domain/ids';
import { SmartComposerInput } from '@shared/components/smart-composer-input/smart-composer-input';

@Component({
  selector: 'app-question-reply-composer',
  imports: [ReactiveFormsModule, SmartComposerInput],
  templateUrl: './question-reply-composer.html',
  styleUrl: './question-reply-composer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionReplyComposer {
  readonly question     = input.required<ThreadMessage>();
  readonly vaultItemId  = input.required<VaultItemId>();
  readonly currentActor = input.required<ActorId>();

  readonly posted = output<CreateThreadMessagePayload>();

  readonly bodyControl = new FormControl('', { nonNullable: true, validators: [Validators.required] });

  submit(): void {
    if (!this.bodyControl.valid || !this.bodyControl.value.trim()) return;

    const id = threadMessageId(`${Date.now()}-${Math.random().toString(36).slice(2)}`);

    const payload: CreateThreadMessagePayload = {
      id,
      vault_item_id:   this.vaultItemId(),
      author_actor_id: this.currentActor(),
      kind:            'answer',
      body:            this.bodyControl.value.trim(),
      in_reply_to:     this.question().id as ThreadMessageId,
      answered_by:     null,
    };

    this.posted.emit(payload);
    this.bodyControl.reset('');
  }
}
