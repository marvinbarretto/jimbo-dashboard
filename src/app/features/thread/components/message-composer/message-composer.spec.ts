import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { MessageComposer } from './message-composer';
import { vaultItemId, actorId, threadMessageId } from '../../../../domain/ids';
import type { CreateThreadMessagePayload } from '../../../../domain/thread';

const VAULT_ID = vaultItemId('vault-composer-1');
const ACTOR_ID = actorId('marvin');

describe('MessageComposer', () => {
  let component: MessageComposer;
  let fixture: ComponentFixture<MessageComposer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MessageComposer],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(MessageComposer);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('vaultItemId', VAULT_ID);
    fixture.componentRef.setInput('currentActor', ACTOR_ID);
    await fixture.whenStable();
  });

  it('creates', () => {
    expect(component).toBeTruthy();
  });

  it('form is invalid when body is empty', () => {
    component.form.patchValue({ body: '' });
    expect(component.form.invalid).toBe(true);
  });

  it('form is valid for a comment with body filled', () => {
    component.form.patchValue({ kind: 'comment', body: 'a non-empty message' });
    expect(component.form.valid).toBe(true);
  });

  it('switching to answer makes in_reply_to required', () => {
    component.selectKind('answer');
    // in_reply_to is empty — form should be invalid.
    expect(component.form.controls.in_reply_to.errors?.['required']).toBeTruthy();
  });

  it('switching back from answer clears in_reply_to validation', () => {
    component.selectKind('answer');
    component.selectKind('comment');
    // Validator should be gone — in_reply_to empty is fine for comment.
    expect(component.form.controls.in_reply_to.valid).toBe(true);
  });

  it('selecting answer kind and filling in_reply_to makes form valid with body', () => {
    const questionId = threadMessageId('q-spec');
    component.form.patchValue({
      kind:        'answer',
      in_reply_to: questionId,
      body:        'the answer to life, the universe, and everything',
    });
    expect(component.form.valid).toBe(true);
  });

  it('emits a CreateThreadMessagePayload with null in_reply_to for comment', () => {
    let captured: CreateThreadMessagePayload | undefined;
    component.posted.subscribe(p => { captured = p; });

    component.form.patchValue({ kind: 'comment', body: 'just a comment' });
    component.submit();

    expect(captured?.kind).toBe('comment');
    expect(captured?.in_reply_to).toBeNull();
    expect(captured?.vault_item_id).toBe(VAULT_ID);
    expect(captured?.author_actor_id).toBe(ACTOR_ID);
  });

  it('resets form to comment after successful submit', () => {
    component.form.patchValue({ kind: 'question', body: 'what is happening here?' });
    component.submit();
    expect(component.form.controls.kind.value).toBe('comment');
    expect(component.form.controls.body.value).toBe('');
  });

  it('does not emit when form is invalid — silent submit guard', () => {
    const spy = vi.fn();
    component.posted.subscribe(spy);
    // body is empty — form is invalid
    component.submit();
    expect(spy).not.toHaveBeenCalled();
  });
});
