import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ThreadService } from './thread.service';
import { vaultItemId, threadMessageId, actorId } from '@domain/ids';
import type { ThreadMessage } from '@domain/thread';
import { environment } from '../../../../environments/environment';

const VAULT_ID = vaultItemId('item-1');

function makeMessage(overrides: Partial<ThreadMessage> = {}): ThreadMessage {
  return {
    id: threadMessageId('m-1'),
    vault_item_id: VAULT_ID,
    author_actor_id: actorId('marvin'),
    kind: 'comment',
    body: 'hello world',
    in_reply_to: null,
    answered_by: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('ThreadService', () => {
  let service: ThreadService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
        ThreadService,
      ],
    });
    service = TestBed.inject(ThreadService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('creates', () => {
    expect(service).toBeTruthy();
  });

  describe('loadFor', () => {
    it('populates the bucket for the given vault item', () => {
      const msg = makeMessage();
      service.loadFor(VAULT_ID);

      const req = http.expectOne(r => r.url.includes('/thread-messages'));
      req.flush({ items: [msg] });

      expect(service.messagesFor(VAULT_ID)()).toEqual([msg]);
    });

    it('sets empty array on HTTP error — no endpoint yet is not a crash', () => {
      service.loadFor(VAULT_ID);
      const req = http.expectOne(r => r.url.includes('/thread-messages'));
      req.error(new ProgressEvent('network error'));

      expect(service.messagesFor(VAULT_ID)()).toEqual([]);
    });
  });

  describe('post', () => {
    it('optimistically appends the message before server confirms', () => {
      const payload = makeMessage({ id: threadMessageId('m-opt') });
      service.post(payload);
      // Don't flush yet — optimistic insert should be immediate.
      expect(service.messagesFor(VAULT_ID)().some(m => m.id === 'm-opt')).toBe(true);
      http.expectOne(r => r.url.includes('/thread-messages')).flush(payload);
    });

    it('rolls back on error — the ghost message disappears', () => {
      const payload = makeMessage({ id: threadMessageId('m-ghost') });
      service.post(payload);
      http.expectOne(r => r.url.includes('/thread-messages'))
        .error(new ProgressEvent('server refused'));

      expect(service.messagesFor(VAULT_ID)().some(m => m.id === 'm-ghost')).toBe(false);
    });

    it('dual-write: posting an answer flips answered_by on the question optimistically', () => {
      // Pre-populate a question so it's already in the bucket.
      const question = makeMessage({ id: threadMessageId('q-1'), kind: 'question' });
      service.loadFor(VAULT_ID);
      http.expectOne(r => r.url.includes('/thread-messages')).flush({ items: [question] });

      const answer = makeMessage({
        id: threadMessageId('a-1'),
        kind: 'answer',
        in_reply_to: question.id,
      });
      service.post(answer);

      const updatedQuestion = service.messagesFor(VAULT_ID)().find(m => m.id === 'q-1');
      expect(updatedQuestion?.answered_by).toBe('a-1');

      // Flush to avoid afterEach verify failure.
      http.expectOne(r => r.url.includes('/thread-messages')).flush(answer);
    });

    it('rolls back answered_by on answer post failure', () => {
      const question = makeMessage({ id: threadMessageId('q-rb'), kind: 'question' });
      service.loadFor(VAULT_ID);
      http.expectOne(r => r.url.includes('/thread-messages')).flush({ items: [question] });

      const answer = makeMessage({
        id: threadMessageId('a-rb'),
        kind: 'answer',
        in_reply_to: question.id,
      });
      service.post(answer);
      http.expectOne(r => r.url.includes('/thread-messages'))
        .error(new ProgressEvent('rollback test'));

      const q = service.messagesFor(VAULT_ID)().find(m => m.id === 'q-rb');
      expect(q?.answered_by).toBeNull();
    });
  });

  describe('openQuestionsFor', () => {
    it('returns only unanswered questions', () => {
      const openQ   = makeMessage({ id: threadMessageId('q-open'), kind: 'question', answered_by: null });
      const closedQ = makeMessage({ id: threadMessageId('q-done'), kind: 'question', answered_by: threadMessageId('a-done') });
      const comment = makeMessage({ id: threadMessageId('c-1'), kind: 'comment' });

      service.loadFor(VAULT_ID);
      http.expectOne(r => r.url.includes('/thread-messages')).flush({ items: [openQ, closedQ, comment] });

      const open = service.openQuestionsFor(VAULT_ID)();
      expect(open).toHaveLength(1);
      expect(open[0].id).toBe('q-open');
    });
  });
});
