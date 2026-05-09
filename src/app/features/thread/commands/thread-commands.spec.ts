import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { resetSeedModeCache } from '@shared/seed-mode';
import { ThreadCommands } from './thread-commands';
import { ThreadService } from '@features/thread/data-access/thread.service';
import { QuestionsService } from '@features/questions/data-access/questions.service';
import { vaultItemId, threadMessageId, actorId } from '@domain/ids';
import type { CreateThreadMessagePayload } from '@domain/thread';

// Seed mode keeps the suite hermetic — ThreadService.post is well-tested
// elsewhere; here we prove the command layer's compound behaviour:
//  * post() is a pass-through
//  * answerQuestion() composes thread.post + questions.markAnswered
//  * answerQuestion() refuses payloads that aren't properly-formed answers

describe('ThreadCommands (seed mode)', () => {
  let commands: ThreadCommands;
  let thread: ThreadService;
  let questions: QuestionsService;

  // Capture call order across services so compound semantics are verifiable.
  const calls: string[] = [];

  beforeEach(() => {
    window.history.replaceState({}, '', '?seed=1');
    resetSeedModeCache();
    calls.length = 0;

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    commands = TestBed.inject(ThreadCommands);
    thread = TestBed.inject(ThreadService);
    questions = TestBed.inject(QuestionsService);

    // Wrap the actual methods so we capture compound order without mocking
    // out the implementations. Real services run in seed mode so behaviour
    // is end-to-end realistic.
    const realThreadPost = thread.post.bind(thread);
    thread.post = (payload) => { calls.push('thread.post'); realThreadPost(payload); };
    const realQMarkAnswered = questions.markAnswered.bind(questions);
    questions.markAnswered = (qid, aid) => { calls.push('questions.markAnswered'); realQMarkAnswered(qid, aid); };
  });

  afterEach(() => {
    window.history.replaceState({}, '', window.location.pathname);
    resetSeedModeCache();
  });

  function fakeAnswerPayload(): CreateThreadMessagePayload {
    return {
      id: threadMessageId(crypto.randomUUID()),
      vault_item_id: vaultItemId('11111111-1111-1111-1111-111111111111'),
      author_actor_id: actorId('marvin'),
      kind: 'answer',
      body: 'Pasta needs to bake 22 minutes covered then 5 uncovered.',
      in_reply_to: threadMessageId('q-1'),
      answered_by: null,
    };
  }

  // ── post ───────────────────────────────────────────────────────────────

  describe('post', () => {
    it('delegates to thread.service.post', () => {
      const payload: CreateThreadMessagePayload = {
        id: threadMessageId(crypto.randomUUID()),
        vault_item_id: vaultItemId('11111111-1111-1111-1111-111111111111'),
        author_actor_id: actorId('marvin'),
        kind: 'comment',
        body: 'noted, will revisit',
        in_reply_to: null,
        answered_by: null,
      };

      commands.post(payload);

      expect(calls).toEqual(['thread.post']);
    });
  });

  // ── answerQuestion ─────────────────────────────────────────────────────

  describe('answerQuestion', () => {
    it('composes thread.post and questions.markAnswered in that order', () => {
      const payload = fakeAnswerPayload();
      commands.answerQuestion(payload);

      // Order matters: post the message first so its id exists, then mark
      // the question's questions-index entry as answered referencing that id.
      expect(calls).toEqual(['thread.post', 'questions.markAnswered']);
    });

    it("refuses payloads with kind !== 'answer'", () => {
      const bad: CreateThreadMessagePayload = {
        ...fakeAnswerPayload(),
        kind: 'comment',
      };
      expect(() => commands.answerQuestion(bad)).toThrow(/kind='answer'/);
      expect(calls).toEqual([]);
    });

    it('refuses payloads with no in_reply_to', () => {
      const bad: CreateThreadMessagePayload = {
        ...fakeAnswerPayload(),
        in_reply_to: null,
      };
      expect(() => commands.answerQuestion(bad)).toThrow(/in_reply_to/);
      expect(calls).toEqual([]);
    });
  });
});
