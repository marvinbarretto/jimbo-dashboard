import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { MessageList } from './message-list';
import { vaultItemId, threadMessageId, actorId } from '../../../../domain/ids';
import type { ThreadMessage } from '../../../../domain/thread';

const VAULT_ID = vaultItemId('vault-1');

function makeMsg(overrides: Partial<ThreadMessage> = {}): ThreadMessage {
  return {
    id: threadMessageId('m-1'),
    vault_item_id: VAULT_ID,
    author_actor_id: actorId('marvin'),
    kind: 'comment',
    body: 'a message body',
    in_reply_to: null,
    answered_by: null,
    created_at: '2024-01-01T12:00:00.000Z',
    ...overrides,
  };
}

describe('MessageList', () => {
  let component: MessageList;
  let fixture: ComponentFixture<MessageList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MessageList],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(MessageList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  describe('groups()', () => {
    it('places answers nested under their question, not as top-level groups', () => {
      const question = makeMsg({ id: threadMessageId('q-1'), kind: 'question' });
      const answer   = makeMsg({ id: threadMessageId('a-1'), kind: 'answer', in_reply_to: question.id });
      const comment  = makeMsg({ id: threadMessageId('c-1'), kind: 'comment' });

      fixture.componentRef.setInput('messages', [question, answer, comment]);
      fixture.detectChanges();

      const groups = component.groups();
      // The answer should NOT appear as its own top-level group.
      const topLevelIds = groups.map(g => g.message.id);
      expect(topLevelIds).not.toContain('a-1');
      // The answer should live inside the question's group.
      const qGroup = groups.find(g => g.message.id === 'q-1');
      expect(qGroup?.answers.map(a => a.id)).toContain('a-1');
    });

    it('treats a comment as its own top-level group with no nested answers', () => {
      const comment = makeMsg({ id: threadMessageId('c-2'), kind: 'comment' });
      fixture.componentRef.setInput('messages', [comment]);
      fixture.detectChanges();

      const groups = component.groups();
      expect(groups).toHaveLength(1);
      expect(groups[0].answers).toHaveLength(0);
    });

    it('orphaned answer (in_reply_to not found) surfaces as top-level rather than silently vanishing', () => {
      const orphan = makeMsg({
        id: threadMessageId('a-orphan'),
        kind: 'answer',
        in_reply_to: threadMessageId('ghost-question'),
      });
      fixture.componentRef.setInput('messages', [orphan]);
      fixture.detectChanges();

      const groups = component.groups();
      expect(groups.map(g => g.message.id)).toContain('a-orphan');
    });
  });
});
