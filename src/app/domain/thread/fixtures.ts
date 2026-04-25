import type { ThreadMessage } from './thread-message';
import { actorId, threadMessageId } from '../ids';
import { VAULT_ITEM_IDS } from '../vault/fixtures';

// Messages exercise every kind:
//   - A: open question from boris (intake-quality reject) — blocks readiness
//   - B: comment from marvin (context note)
//   - C: question from ralph + answer from marvin — answered, does NOT block

const MSG_A_Q1 = threadMessageId('aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa');
const MSG_B_C1 = threadMessageId('bbbbbbbb-1111-1111-1111-bbbbbbbbbbbb');
const MSG_C_Q1 = threadMessageId('cccccccc-1111-1111-1111-cccccccccccc');
const MSG_C_A1 = threadMessageId('cccccccc-2222-2222-2222-cccccccccccc');

export const THREAD_MESSAGE_IDS = {
  A_Q1: MSG_A_Q1,
  B_C1: MSG_B_C1,
  C_Q1: MSG_C_Q1,
  C_A1: MSG_C_A1,
} as const;

export const THREAD_MESSAGES = [
  {
    id: MSG_A_Q1,
    vault_item_id: VAULT_ITEM_IDS.A,
    author_actor_id: actorId('boris'),
    kind: 'question',
    body:
      "I can't tell what action this needs. What did Sam mention specifically — a venue " +
      'booking? a complaint? a partnership? Could you paste the original message or ' +
      'summarise the ask?',
    in_reply_to: null,
    answered_by: null,
    created_at: '2026-04-24T07:16:00Z',
  },
  {
    id: MSG_B_C1,
    vault_item_id: VAULT_ITEM_IDS.B,
    author_actor_id: actorId('marvin'),
    kind: 'comment',
    body: 'Postcode regex lives in `lib/validators/uk-postcode.ts` — reuse that, do not redefine.',
    in_reply_to: null,
    answered_by: null,
    created_at: '2026-04-23T11:45:00Z',
  },
  {
    id: MSG_C_Q1,
    vault_item_id: VAULT_ITEM_IDS.C,
    author_actor_id: actorId('ralph'),
    kind: 'question',
    body: 'Should this also gate the manual override path, or only the automatic chain?',
    in_reply_to: null,
    answered_by: MSG_C_A1,
    created_at: '2026-04-23T08:10:00Z',
  },
  {
    id: MSG_C_A1,
    vault_item_id: VAULT_ITEM_IDS.C,
    author_actor_id: actorId('marvin'),
    kind: 'answer',
    body: 'Automatic only. Manual override is intentional bypass.',
    in_reply_to: MSG_C_Q1,
    answered_by: null,
    created_at: '2026-04-23T08:42:00Z',
  },
] as const satisfies readonly ThreadMessage[];
