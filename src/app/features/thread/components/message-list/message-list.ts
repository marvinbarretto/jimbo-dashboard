import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ThreadMessage } from '@domain/thread';
import type { Actor } from '@domain/actors';
import type { ActorId } from '@domain/ids';
import type { Attachment } from '@domain/attachments';
import { RelativeTimePipe } from '@shared/pipes/relative-time.pipe';
import { formatBytes } from '@shared/utils/datetime.utils';
import { EntityChip } from '@shared/components/entity-chip/entity-chip';

// A grouped message row: a top-level message plus any answers nested under it.
// Questions and comments float at top level; answers only appear nested under their question.
export interface MessageGroup {
  message: ThreadMessage;
  answers: ThreadMessage[];
}

@Component({
  selector: 'app-message-list',
  imports: [RelativeTimePipe, EntityChip],
  templateUrl: './message-list.html',
  styleUrl: './message-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessageList {
  readonly messages = input<ThreadMessage[]>([]);
  readonly actors = input<Record<ActorId, Actor>>({} as Record<ActorId, Actor>);
  // Flat map of attachments keyed by ThreadMessageId string, provided by thread-view.
  readonly attachmentsByMessage = input<Record<string, Attachment[]>>({});

  protected readonly formatBytes = formatBytes;

  // Build display groups: each non-answer message is a top-level node;
  // answers are nested under the question they reply to.
  // Orphaned answers (in_reply_to set but parent is a comment, or parent not found) float at top level.
  readonly groups = computed<MessageGroup[]>(() => {
    const msgs = this.messages();
    const answersByParent = new Map<string, ThreadMessage[]>();

    for (const m of msgs) {
      if (m.kind === 'answer' && m.in_reply_to) {
        const bucket = answersByParent.get(m.in_reply_to) ?? [];
        bucket.push(m);
        answersByParent.set(m.in_reply_to, bucket);
      }
    }

    const groups: MessageGroup[] = [];
    for (const m of msgs) {
      // Skip answers that are properly nested under a question — they'll appear in answers[].
      if (m.kind === 'answer' && m.in_reply_to) {
        const parent = msgs.find(p => p.id === m.in_reply_to);
        if (parent?.kind === 'question') continue;
      }
      groups.push({
        message: m,
        answers: m.kind === 'question' ? (answersByParent.get(m.id) ?? []) : [],
      });
    }
    return groups;
  });

  attachmentsFor(message: ThreadMessage): Attachment[] {
    return this.attachmentsByMessage()[message.id] ?? [];
  }

  // Returns the display name only — template prepends `@`. Falling back to the raw actor id
  // (a slug like 'boris') is fine; the template's `@` prefix still produces a sensible handle.
  authorName(message: ThreadMessage): string {
    return this.actors()[message.author_actor_id]?.display_name ?? message.author_actor_id;
  }

  authorKind(message: ThreadMessage): string {
    return this.actors()[message.author_actor_id]?.kind ?? 'human';
  }

  // For an answer, resolve the parent author so we can show "↳ replying to @ralph".
  replyToAuthor(answer: ThreadMessage): { id: ActorId; label: string } | null {
    if (!answer.in_reply_to) return null;
    const parent = this.messages().find(m => m.id === answer.in_reply_to);
    if (!parent) return null;
    return { id: parent.author_actor_id, label: this.authorName(parent) };
  }
}
