// Application-service / command layer for thread message lifecycle.
//
// Mirrors VaultItemCommands: components, dialogs, and pages call this; they
// do NOT call mutation methods on ThreadService directly. The command layer
// owns the compound concerns — chiefly, that posting an "answer" message
// affects TWO stores (the thread's own answered_by chain AND the questions
// index that tracks open-question state across the dashboard).
//
// Reads (messagesFor, openQuestionsFor) stay on ThreadService — nothing
// composes around them, and the path-level lint rule allows them through
// for now. When the read/write surface split lands, those stay with the
// read-only signal surface.

import { Injectable, inject } from '@angular/core';

import { ThreadService } from '@features/thread/data-access/thread.service';
import { QuestionsService } from '@features/questions/data-access/questions.service';
import { AwaitingService } from '@features/awaiting/data-access/awaiting.service';
import type { CreateThreadMessagePayload } from '@domain/thread';

@Injectable({ providedIn: 'root' })
export class ThreadCommands {
  private readonly thread = inject(ThreadService);
  private readonly questions = inject(QuestionsService);
  private readonly awaiting = inject(AwaitingService);

  /**
   * Post a thread message — comment, question, answer, or correction.
   * Pass-through to ThreadService.post; the service already handles the
   * thread-internal answered_by side-effect when kind === 'answer'.
   *
   * Use `answerQuestion` instead when posting an answer that should also
   * mark the question off in the questions index — the cross-store update
   * is the compound part this layer exists to absorb.
   */
  post(payload: CreateThreadMessagePayload): void {
    this.thread.post(payload);
  }

  /**
   * Compound: post an answer to a question AND mark the question resolved
   * in every index that tracks open questions — the questions page and the
   * execution board's awaiting strip. Both must clear the row optimistically
   * or answering appears to do nothing until the next fetch.
   *
   * Throws synchronously if the payload isn't a properly-formed answer
   * (kind must be 'answer', in_reply_to must reference the question id) —
   * the UI guards against this but the service is the durable last line
   * of defence.
   */
  answerQuestion(payload: CreateThreadMessagePayload): void {
    if (payload.kind !== 'answer') {
      throw new Error(`answerQuestion requires kind='answer', got '${payload.kind}'`);
    }
    if (!payload.in_reply_to) {
      throw new Error('answerQuestion requires in_reply_to (the question id)');
    }
    this.thread.post(payload);
    this.questions.markAnswered(payload.in_reply_to, payload.id);
    this.awaiting.markAnswered(payload.in_reply_to, payload.id);
  }
}
