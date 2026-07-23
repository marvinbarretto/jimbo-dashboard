import { describe, expect, it } from 'vitest';
import { pendingRepliesFor } from './pending-reply';
import { actorId, threadMessageId, vaultItemId } from '../ids';
import type { ThreadMessage, ThreadMessageKind } from './thread-message';

const ME = actorId('marvin');
const THEM = actorId('boris');

function msg(
  id: string,
  author: typeof ME,
  created_at: string,
  kind: ThreadMessageKind = 'comment',
): ThreadMessage {
  return {
    id: threadMessageId(id),
    vault_item_id: vaultItemId('note_1'),
    author_actor_id: author,
    kind,
    body: id,
    in_reply_to: null,
    answered_by: null,
    created_at,
  };
}

describe('pendingRepliesFor', () => {
  it('counts a plain comment from someone else — the bug that hid the ask', () => {
    const pending = pendingRepliesFor([msg('a', THEM, '2026-07-22T10:00:00Z')], ME);
    expect(pending.map(m => m.id)).toEqual([threadMessageId('a')]);
  });

  it('ignores everything up to and including my last message', () => {
    const pending = pendingRepliesFor(
      [
        msg('theirs-old', THEM, '2026-07-22T10:00:00Z'),
        msg('mine', ME, '2026-07-22T11:00:00Z'),
        msg('theirs-new', THEM, '2026-07-22T12:00:00Z'),
      ],
      ME,
    );
    expect(pending.map(m => m.id)).toEqual([threadMessageId('theirs-new')]);
  });

  it('returns nothing when I spoke last', () => {
    const pending = pendingRepliesFor(
      [msg('theirs', THEM, '2026-07-22T10:00:00Z'), msg('mine', ME, '2026-07-22T11:00:00Z')],
      ME,
    );
    expect(pending).toEqual([]);
  });

  it('excludes answers — they close a loop rather than opening one', () => {
    const pending = pendingRepliesFor(
      [msg('reply', THEM, '2026-07-22T12:00:00Z', 'answer')],
      ME,
    );
    expect(pending).toEqual([]);
  });

  it('orders by created_at, not array order', () => {
    const pending = pendingRepliesFor(
      [
        msg('theirs-new', THEM, '2026-07-22T12:00:00Z'),
        msg('mine', ME, '2026-07-22T11:00:00Z'),
        msg('theirs-old', THEM, '2026-07-22T10:00:00Z'),
      ],
      ME,
    );
    expect(pending.map(m => m.id)).toEqual([threadMessageId('theirs-new')]);
  });
});
