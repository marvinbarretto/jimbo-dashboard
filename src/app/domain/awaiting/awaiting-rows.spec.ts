import { describe, it, expect } from 'vitest';
import { mergeAwaitingRows } from './awaiting-rows';
import type { Handback, ReviewWaiting } from './awaiting';
import type { OpenQuestionView } from '../thread';
import type { ActorId, ThreadMessageId, VaultItemId } from '../ids';

function handback(over: Partial<Handback> = {}): Handback {
  return {
    activity_id: 1,
    note_id: 'note-1' as VaultItemId,
    seq: 101,
    title: 'Decide whether the Breeze escalation is personal-data work',
    type: 'task',
    status: 'active',
    ts: '2026-08-14T12:00:00.000Z',
    from_actor: 'jimbo' as ActorId,
    actor: 'jimbo' as ActorId,
    action: 'reassigned',
    reason: 'pipeline saturated',
    priority: 2,
    ...over,
  };
}

function question(over: Partial<OpenQuestionView> = {}): OpenQuestionView {
  return {
    id: 'q-1' as ThreadMessageId,
    vault_item_id: 'note-2' as VaultItemId,
    vault_item_seq: 202,
    vault_item_title: 'Wire the VAPID keypair',
    vault_item_grooming_status: 'ungroomed',
    vault_item_assigned_to: 'marvin' as ActorId,
    author_actor_id: 'boris' as ActorId,
    kind: 'question',
    body: 'Which VPS holds the key?',
    in_reply_to: null,
    answered_by: null,
    created_at: '2026-08-14T09:00:00.000Z',
    age_days: 1,
    ...over,
  };
}

function review(over: Partial<ReviewWaiting> = {}): ReviewWaiting {
  return {
    id: 'note-3',
    seq: '303',
    title: 'Add a CONTRIBUTING note',
    skill: 'code/pr-from-issue',
    summary: 'Opened PR #28',
    prUrl: 'https://github.com/marvinbarretto/pmq-bingo/pull/28',
    prState: 'open',
    completedAt: '2026-08-14T11:00:00.000Z',
    ...over,
  };
}

describe('mergeAwaitingRows', () => {
  it('interleaves both kinds newest first', () => {
    const rows = mergeAwaitingRows(
      [handback({ ts: '2026-08-14T08:00:00.000Z' })],
      [question({ created_at: '2026-08-14T10:00:00.000Z' })],
    );

    expect(rows.map(r => r.kind)).toEqual(['question', 'handback']);
  });

  it('puts an older question below a newer handback', () => {
    const rows = mergeAwaitingRows(
      [handback({ ts: '2026-08-14T11:00:00.000Z' })],
      [question({ created_at: '2026-08-10T09:00:00.000Z' })],
    );

    expect(rows.map(r => r.kind)).toEqual(['handback', 'question']);
  });

  // The handback and the question are one event with two records; showing both
  // offers "give it back" beside "answer it", and giving it back unanswered is
  // exactly the loop this feature exists to stop.
  it('drops a handback whose note already shows as a question', () => {
    const shared = 'note-9' as VaultItemId;
    const rows = mergeAwaitingRows(
      [handback({ note_id: shared, reason: 'questions_pending' })],
      [question({ vault_item_id: shared })],
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].kind).toBe('question');
  });

  it('keys rows distinctly so a note with both records cannot collide', () => {
    const rows = mergeAwaitingRows(
      [handback({ activity_id: 7 })],
      [question()],
    );

    expect(new Set(rows.map(r => r.key)).size).toBe(rows.length);
  });

  it('returns nothing when there is nothing waiting', () => {
    expect(mergeAwaitingRows([], [])).toEqual([]);
  });

  it('interleaves finished work with the other two kinds by recency', () => {
    const rows = mergeAwaitingRows(
      [handback({ ts: '2026-08-14T08:00:00.000Z' })],
      [question({ created_at: '2026-08-14T12:00:00.000Z' })],
      [review({ completedAt: '2026-08-14T10:00:00.000Z' })],
    );

    expect(rows.map(r => r.kind)).toEqual(['question', 'review', 'handback']);
  });

  // "Accept this" is a later and more actionable state than "an agent gave
  // this back" — showing both for one note would offer two different verbs.
  it('drops a handback whose note is already awaiting acceptance', () => {
    const shared = 'note-42';
    const rows = mergeAwaitingRows(
      [handback({ note_id: shared as never })],
      [],
      [review({ id: shared })],
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].kind).toBe('review');
  });

  // completedAt is null on older rows; an Invalid Date would sort them to the
  // top and bury genuinely recent work.
  it('sorts undated finished work last rather than first', () => {
    const rows = mergeAwaitingRows(
      [],
      [question({ created_at: '2026-08-01T00:00:00.000Z' })],
      [review({ completedAt: null })],
    );

    expect(rows.map(r => r.kind)).toEqual(['question', 'review']);
  });

  it('still works when no reviews are passed at all', () => {
    const rows = mergeAwaitingRows([handback()], [question()]);
    expect(rows.map(r => r.kind).sort()).toEqual(['handback', 'question']);
  });
});
