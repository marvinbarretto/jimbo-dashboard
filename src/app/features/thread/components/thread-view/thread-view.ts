import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
} from '@angular/core';
import type { VaultItemId, ActorId, ThreadMessageId } from '../../../../domain/ids';
import type { CreateThreadMessagePayload } from '../../../../domain/thread';
import type { Attachment } from '../../../../domain/attachments';
import type { Actor } from '../../../../domain/actors';
import { ThreadService } from '../../data-access/thread.service';
import { AttachmentsService } from '../../data-access/attachments.service';
import { MessageList } from '../message-list/message-list';
import { MessageComposer } from '../message-composer/message-composer';

@Component({
  selector: 'app-thread-view',
  imports: [MessageList, MessageComposer],
  templateUrl: './thread-view.html',
  styleUrl: './thread-view.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThreadView {
  private readonly service = inject(ThreadService);
  private readonly attachmentsService = inject(AttachmentsService);

  readonly vaultItemId = input.required<VaultItemId>();
  readonly currentActor = input.required<ActorId>();
  // Actor lookup map provided by the parent; used by message-list for author display.
  readonly actorMap = input<Record<ActorId, Actor>>({} as Record<ActorId, Actor>);

  // Re-derive when vaultItemId changes — must be called inside computed() so reactivity flows.
  readonly messages = computed(() => this.service.messagesFor(this.vaultItemId())());
  readonly openQuestions = computed(() => this.service.openQuestionsFor(this.vaultItemId())());

  readonly openCount = computed(() => this.openQuestions().length);
  readonly totalCount = computed(() => this.messages().length);

  // Flat map of all attachments keyed by ThreadMessageId string for efficient lookup in message-list.
  // Re-computed whenever message-list changes (optimistic inserts will trigger this — acceptable
  // scaffolding behaviour since the endpoint 404s anyway and won't produce real batch calls).
  readonly attachmentsByMessage = computed<Record<string, Attachment[]>>(() => {
    const msgs = this.messages();
    const map: Record<string, Attachment[]> = {};
    for (const msg of msgs) {
      map[msg.id] = this.attachmentsService.attachmentsFor(msg.id as ThreadMessageId)();
    }
    return map;
  });

  constructor() {
    // Re-fetch messages whenever the vault item changes.
    effect(() => {
      const id = this.vaultItemId();
      if (id) this.service.loadFor(id);
    });

    // Batch-load attachments for all messages in the thread whenever the message list changes.
    effect(() => {
      const ids = this.messages().map(m => m.id as ThreadMessageId);
      if (ids.length > 0) this.attachmentsService.loadFor(ids);
    });
  }

  onPosted(payload: CreateThreadMessagePayload): void {
    this.service.post(payload);
  }
}
