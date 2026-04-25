import type { ActivityEvent } from './activity-event';
import { activityId, actorId, projectId } from '../ids';
import { VAULT_ITEM_IDS } from '../vault/fixtures';
import { THREAD_MESSAGE_IDS } from '../thread/fixtures';

// Append-only history. Exercises every variant of the vault-side discriminated union:
//   created, assigned, completion_changed, archived, thread_message_posted.
// Project-side variants are exercised in domain/projects/fixtures.ts.
// Timestamps are deliberately ordered to support a chronological view per item.

export const ACTIVITY_EVENTS = [
  // -- Item A: created via telegram intake (jimbo as the system identity), intake-quality posted a question --
  {
    id: activityId('e1111111-0001-0001-0001-000000000000'),
    vault_item_id: VAULT_ITEM_IDS.A,
    actor_id: actorId('jimbo'),
    at: '2026-04-24T07:14:00Z',
    type: 'created',
  },
  {
    id: activityId('e1111111-0002-0002-0002-000000000000'),
    vault_item_id: VAULT_ITEM_IDS.A,
    actor_id: actorId('boris'),
    at: '2026-04-24T07:16:00Z',
    type: 'thread_message_posted',
    message_id: THREAD_MESSAGE_IDS.A_Q1,
    message_kind: 'question',
  },

  // -- Item B: created, classified (assigned), commented, marked ready --
  {
    id: activityId('e2222222-0001-0001-0001-000000000000'),
    vault_item_id: VAULT_ITEM_IDS.B,
    actor_id: actorId('marvin'),
    at: '2026-04-23T11:32:00Z',
    type: 'created',
  },
  {
    id: activityId('e2222222-0002-0002-0002-000000000000'),
    vault_item_id: VAULT_ITEM_IDS.B,
    actor_id: actorId('jimbo'),
    at: '2026-04-23T11:38:00Z',
    type: 'assigned',
    from_actor_id: null,
    to_actor_id: actorId('boris'),
    reason: 'vault-classify selected boris based on standard tier match',
  },
  {
    id: activityId('e2222222-0003-0003-0003-000000000000'),
    vault_item_id: VAULT_ITEM_IDS.B,
    actor_id: actorId('marvin'),
    at: '2026-04-23T11:45:00Z',
    type: 'thread_message_posted',
    message_id: THREAD_MESSAGE_IDS.B_C1,
    message_kind: 'comment',
  },

  // -- Item C: created, ralph asked, marvin answered, classified (via vault-classify skill) --
  {
    id: activityId('e3333333-0001-0001-0001-000000000000'),
    vault_item_id: VAULT_ITEM_IDS.C,
    actor_id: actorId('marvin'),
    at: '2026-04-22T16:08:00Z',
    type: 'created',
  },
  {
    id: activityId('e3333333-0005-0005-0005-000000000000'),
    vault_item_id: VAULT_ITEM_IDS.C,
    actor_id: actorId('boris'),
    at: '2026-04-23T09:04:00Z',
    type: 'grooming_status_changed',
    from: 'intake_complete',
    to: 'classified',
    note: 'vault-classify completed',
  },
  {
    id: activityId('e3333333-0002-0002-0002-000000000000'),
    vault_item_id: VAULT_ITEM_IDS.C,
    actor_id: actorId('ralph'),
    at: '2026-04-23T08:10:00Z',
    type: 'thread_message_posted',
    message_id: THREAD_MESSAGE_IDS.C_Q1,
    message_kind: 'question',
  },
  {
    id: activityId('e3333333-0003-0003-0003-000000000000'),
    vault_item_id: VAULT_ITEM_IDS.C,
    actor_id: actorId('marvin'),
    at: '2026-04-23T08:42:00Z',
    type: 'thread_message_posted',
    message_id: THREAD_MESSAGE_IDS.C_A1,
    message_kind: 'answer',
  },
  {
    id: activityId('e3333333-0004-0004-0004-000000000000'),
    vault_item_id: VAULT_ITEM_IDS.C,
    actor_id: actorId('jimbo'),
    at: '2026-04-23T09:05:00Z',
    type: 'assigned',
    from_actor_id: null,
    to_actor_id: actorId('ralph'),
    reason: 'classified, routed to ralph for free-tier execution',
  },

  // -- Item D: full lifecycle to done --
  {
    id: activityId('e4444444-0001-0001-0001-000000000000'),
    vault_item_id: VAULT_ITEM_IDS.D,
    actor_id: actorId('marvin'),
    at: '2026-04-21T10:00:00Z',
    type: 'created',
  },
  {
    id: activityId('e4444444-0002-0002-0002-000000000000'),
    vault_item_id: VAULT_ITEM_IDS.D,
    actor_id: actorId('marvin'),
    at: '2026-04-21T10:05:00Z',
    type: 'assigned',
    from_actor_id: null,
    to_actor_id: actorId('marvin'),
    reason: 'self-assign, one-off migration script',
  },
  {
    id: activityId('e4444444-0003-0003-0003-000000000000'),
    vault_item_id: VAULT_ITEM_IDS.D,
    actor_id: actorId('marvin'),
    at: '2026-04-24T15:42:00Z',
    type: 'completion_changed',
    from: null,
    to: '2026-04-24T15:42:00Z',
    note: 'ran live after dry-run looked clean',
  },

  // -- Item E (ungroomed) --
  {
    id: activityId('e5555555-0001-0001-0001-000000000000'),
    vault_item_id: VAULT_ITEM_IDS.E,
    actor_id: actorId('jimbo'),
    at: '2026-04-25T09:14:00Z',
    type: 'created',
  },

  // -- Item F (intake_complete): created → intake-quality verdict --
  {
    id: activityId('e6666666-0001-0001-0001-000000000000'),
    vault_item_id: VAULT_ITEM_IDS.F,
    actor_id: actorId('marvin'),
    at: '2026-04-24T14:00:00Z',
    type: 'created',
  },
  {
    id: activityId('e6666666-0002-0002-0002-000000000000'),
    vault_item_id: VAULT_ITEM_IDS.F,
    actor_id: actorId('boris'),
    at: '2026-04-24T14:08:00Z',
    type: 'grooming_status_changed',
    from: 'ungroomed',
    to: 'intake_complete',
    note: 'intake-quality: actionability=clear',
  },

  // -- Item G (decomposed): full pipeline minus marvin's final ready flip --
  {
    id: activityId('e7777777-0001-0001-0001-000000000000'),
    vault_item_id: VAULT_ITEM_IDS.G,
    actor_id: actorId('marvin'),
    at: '2026-04-22T10:30:00Z',
    type: 'created',
  },
  {
    id: activityId('e7777777-0002-0002-0002-000000000000'),
    vault_item_id: VAULT_ITEM_IDS.G,
    actor_id: actorId('boris'),
    at: '2026-04-22T10:35:00Z',
    type: 'grooming_status_changed',
    from: 'ungroomed',
    to: 'intake_complete',
    note: 'intake-quality: actionability=clear',
  },
  {
    id: activityId('e7777777-0003-0003-0003-000000000000'),
    vault_item_id: VAULT_ITEM_IDS.G,
    actor_id: actorId('boris'),
    at: '2026-04-22T11:02:00Z',
    type: 'grooming_status_changed',
    from: 'intake_complete',
    to: 'classified',
    note: 'vault-classify completed',
  },
  {
    id: activityId('e7777777-0004-0004-0004-000000000000'),
    vault_item_id: VAULT_ITEM_IDS.G,
    actor_id: actorId('jimbo'),
    at: '2026-04-22T11:10:00Z',
    type: 'assigned',
    from_actor_id: null,
    to_actor_id: actorId('boris'),
    reason: 'classified, routed to boris for standard tier',
  },
  {
    id: activityId('e7777777-0005-0005-0005-000000000000'),
    vault_item_id: VAULT_ITEM_IDS.G,
    actor_id: actorId('boris'),
    at: '2026-04-22T11:42:00Z',
    type: 'grooming_status_changed',
    from: 'classified',
    to: 'decomposed',
    note: 'vault-decompose drafted 3 acceptance criteria',
  },

  // -- Project-side events: localshout has had its criteria tightened, and hermes was
  //    created earlier in the year. Exercises every ProjectActivityEvent variant.
  {
    id: activityId('p1111111-0001-0001-0001-000000000000'),
    project_id: projectId('hermes'),
    actor_id: actorId('marvin'),
    at: '2026-01-04T09:00:00Z',
    type: 'project_created',
  },
  {
    id: activityId('p2222222-0001-0001-0001-000000000000'),
    project_id: projectId('localshout'),
    actor_id: actorId('marvin'),
    at: '2026-03-12T09:00:00Z',
    type: 'project_created',
  },
  {
    id: activityId('p2222222-0002-0002-0002-000000000000'),
    project_id: projectId('localshout'),
    actor_id: actorId('marvin'),
    at: '2026-04-18T14:20:00Z',
    type: 'project_criteria_changed',
    from:
      '## Event qualification\n\n' +
      'A LocalShout event must have:\n' +
      '- A specific date and time\n' +
      '- A physical location\n',
    to:
      '## Event qualification\n\n' +
      'A LocalShout event must have:\n' +
      '- A specific date and time (not "soon" or "next week")\n' +
      '- A physical location (postcode-resolvable)\n' +
      '- Public attendance (not invite-only)\n' +
      '- A named organiser\n',
  },
] as const satisfies readonly ActivityEvent[];
