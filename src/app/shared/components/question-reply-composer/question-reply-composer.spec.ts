import { TestBed } from '@angular/core/testing';
import { QuestionReplyComposer } from './question-reply-composer';
import type { ThreadMessage, CreateThreadMessagePayload } from '@domain/thread';
import { vaultItemId, actorId, threadMessageId } from '@domain/ids';

const QUESTION: ThreadMessage = {
  id: threadMessageId('q-1'),
  vault_item_id: vaultItemId('item-1'),
  author_actor_id: actorId('boris'),
  kind: 'question',
  body: 'Is this real?',
  in_reply_to: null,
  answered_by: null,
  created_at: new Date().toISOString(),
};

describe('QuestionReplyComposer', () => {
  it('emits answer payload with correct kind and in_reply_to when submit called', () => {
    TestBed.configureTestingModule({ imports: [QuestionReplyComposer] });
    const fixture = TestBed.createComponent(QuestionReplyComposer);
    const comp = fixture.componentInstance;

    fixture.componentRef.setInput('question', QUESTION);
    fixture.componentRef.setInput('vaultItemId', vaultItemId('item-1'));
    fixture.componentRef.setInput('currentActor', actorId('marvin'));
    fixture.detectChanges();

    const emitted: CreateThreadMessagePayload[] = [];
    comp.posted.subscribe((p: CreateThreadMessagePayload) => emitted.push(p));

    comp.bodyControl.setValue('Yes, it is real.');
    comp.submit();

    expect(emitted).toHaveLength(1);
    expect(emitted[0].kind).toBe('answer');
    expect(emitted[0].in_reply_to).toBe(QUESTION.id);
    expect(emitted[0].body).toBe('Yes, it is real.');
    expect(emitted[0].vault_item_id).toBe(vaultItemId('item-1'));
    expect(emitted[0].author_actor_id).toBe(actorId('marvin'));
    expect(emitted[0].answered_by).toBeNull();
  });

  it('does not emit when body is empty', () => {
    TestBed.configureTestingModule({ imports: [QuestionReplyComposer] });
    const fixture = TestBed.createComponent(QuestionReplyComposer);
    const comp = fixture.componentInstance;

    fixture.componentRef.setInput('question', QUESTION);
    fixture.componentRef.setInput('vaultItemId', vaultItemId('item-1'));
    fixture.componentRef.setInput('currentActor', actorId('marvin'));
    fixture.detectChanges();

    const emitted: CreateThreadMessagePayload[] = [];
    comp.posted.subscribe((p: CreateThreadMessagePayload) => emitted.push(p));

    comp.bodyControl.setValue('');
    comp.submit();

    expect(emitted).toHaveLength(0);
  });

  it('clears body after successful submit', () => {
    TestBed.configureTestingModule({ imports: [QuestionReplyComposer] });
    const fixture = TestBed.createComponent(QuestionReplyComposer);
    const comp = fixture.componentInstance;

    fixture.componentRef.setInput('question', QUESTION);
    fixture.componentRef.setInput('vaultItemId', vaultItemId('item-1'));
    fixture.componentRef.setInput('currentActor', actorId('marvin'));
    fixture.detectChanges();

    comp.bodyControl.setValue('some answer');
    comp.submit();

    expect(comp.bodyControl.value).toBe('');
  });
});
