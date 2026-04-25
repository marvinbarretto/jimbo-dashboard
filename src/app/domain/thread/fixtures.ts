import type { ThreadMessage } from './thread-message';
import { actorId, threadMessageId } from '../ids';
import { VAULT_ITEM_IDS } from '../vault/fixtures';

// Messages exercise every kind:
//   - A: open question from boris (intake-quality reject) — blocks readiness
//   - B: comment from marvin (context note)
//   - C: question from ralph + answer from marvin — answered, does NOT block
//   - L: 3 open questions from boris on a vague item (multi-question card test)
//   - M: 1 unanswered question, ~9 days old (stale)
//   - N: 2 questions, 1 answered + 1 still open (partial-answer state)
//   - S: 2 open questions on a classified item (orthogonal blocker test)

const MSG_A_Q1 = threadMessageId('aaaaaaaa-1111-1111-1111-aaaaaaaaaaaa');
const MSG_B_C1 = threadMessageId('bbbbbbbb-1111-1111-1111-bbbbbbbbbbbb');
const MSG_C_Q1 = threadMessageId('cccccccc-1111-1111-1111-cccccccccccc');
const MSG_C_A1 = threadMessageId('cccccccc-2222-2222-2222-cccccccccccc');
// Stress-test messages.
const MSG_L_Q1 = threadMessageId('11111111-2222-2222-2222-000000000001');
const MSG_L_Q2 = threadMessageId('11111111-2222-2222-2222-000000000002');
const MSG_L_Q3 = threadMessageId('11111111-2222-2222-2222-000000000003');
const MSG_M_Q1 = threadMessageId('22222222-3333-3333-3333-000000000001');
const MSG_N_Q1 = threadMessageId('33333333-4444-4444-4444-000000000001');
const MSG_N_A1 = threadMessageId('33333333-4444-4444-4444-000000000002');
const MSG_N_Q2 = threadMessageId('33333333-4444-4444-4444-000000000003');
const MSG_S_Q1 = threadMessageId('44444444-5555-5555-5555-000000000001');
const MSG_S_Q2 = threadMessageId('44444444-5555-5555-5555-000000000002');

export const THREAD_MESSAGE_IDS = {
  A_Q1: MSG_A_Q1,
  B_C1: MSG_B_C1,
  C_Q1: MSG_C_Q1,
  C_A1: MSG_C_A1,
  L_Q1: MSG_L_Q1,
  L_Q2: MSG_L_Q2,
  L_Q3: MSG_L_Q3,
  M_Q1: MSG_M_Q1,
  N_Q1: MSG_N_Q1,
  N_A1: MSG_N_A1,
  N_Q2: MSG_N_Q2,
  S_Q1: MSG_S_Q1,
  S_Q2: MSG_S_Q2,
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

  // L: 3 open questions on a vague brain dump
  {
    id: MSG_L_Q1, vault_item_id: VAULT_ITEM_IDS.L, author_actor_id: actorId('boris'),
    kind: 'question',
    body: 'What "thing" are you referring to? Can you name a person, project, or system?',
    in_reply_to: null, answered_by: null,
    created_at: '2026-04-25T02:16:00Z',
  },
  {
    id: MSG_L_Q2, vault_item_id: VAULT_ITEM_IDS.L, author_actor_id: actorId('boris'),
    kind: 'question',
    body: 'What action would resolve this — a decision, a code change, a message to send?',
    in_reply_to: null, answered_by: null,
    created_at: '2026-04-25T02:16:30Z',
  },
  {
    id: MSG_L_Q3, vault_item_id: VAULT_ITEM_IDS.L, author_actor_id: actorId('boris'),
    kind: 'question',
    body: 'Is there a deadline, or can this go to the someday pile?',
    in_reply_to: null, answered_by: null,
    created_at: '2026-04-25T02:17:00Z',
  },

  // M: 9-day-old unanswered question (stuck signal)
  {
    id: MSG_M_Q1, vault_item_id: VAULT_ITEM_IDS.M, author_actor_id: actorId('boris'),
    kind: 'question',
    body: 'Which Helen, and what was her request? Need at least one of those to act.',
    in_reply_to: null, answered_by: null,
    created_at: '2026-04-16T11:08:00Z',
  },

  // N: partial answer state — Q1 answered, Q2 still open
  {
    id: MSG_N_Q1, vault_item_id: VAULT_ITEM_IDS.N, author_actor_id: actorId('boris'),
    kind: 'question',
    body: 'Hero copy specifically, or full landing page? Is the existing brand voice still right?',
    in_reply_to: null, answered_by: MSG_N_A1,
    created_at: '2026-04-22T15:08:00Z',
  },
  {
    id: MSG_N_A1, vault_item_id: VAULT_ITEM_IDS.N, author_actor_id: actorId('marvin'),
    kind: 'answer',
    body: 'Hero + features. Existing voice is fine, just punchier.',
    in_reply_to: MSG_N_Q1, answered_by: null,
    created_at: '2026-04-22T16:00:00Z',
  },
  {
    id: MSG_N_Q2, vault_item_id: VAULT_ITEM_IDS.N, author_actor_id: actorId('boris'),
    kind: 'question',
    body: 'Got it. Approx word count for hero — one sentence, a paragraph, or longer?',
    in_reply_to: null, answered_by: null,
    created_at: '2026-04-22T16:10:00Z',
  },

  // S: 2 open questions on a classified item — questions block readiness regardless of column
  {
    id: MSG_S_Q1, vault_item_id: VAULT_ITEM_IDS.S, author_actor_id: actorId('ralph'),
    kind: 'question',
    body: 'Are EH8 the only suburb postcodes failing, or is this systematic for outer suburbs?',
    in_reply_to: null, answered_by: null,
    created_at: '2026-04-23T13:30:00Z',
  },
  {
    id: MSG_S_Q2, vault_item_id: VAULT_ITEM_IDS.S, author_actor_id: actorId('ralph'),
    kind: 'question',
    body: 'Should the fallback try a partial-postcode lookup, or fall back to a manual override?',
    in_reply_to: null, answered_by: null,
    created_at: '2026-04-23T13:31:00Z',
  },
] as const satisfies readonly ThreadMessage[];
