import type { ActivityEvent } from './activity-event';
import { activityId, actorId, dispatchId, projectId, skillId } from '../ids';
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
  // Jimbo's orchestration decision — picks an executor for the next stage.
  // This IS the hand-off ceremony: every change-of-hands gets a logged decision
  // with rationale and (when LLM-driven) cost. Sits BEFORE the assigned event,
  // which is now the structural fact left behind by this decision.
  {
    id: activityId('e7777777-0008-0008-0008-000000000000'),
    vault_item_id: VAULT_ITEM_IDS.G,
    actor_id: actorId('jimbo'),
    at: '2026-04-22T11:09:30Z',
    type: 'agent_run_completed',
    skill_id: skillId('jimbo/orchestrate-routing'),
    dispatch_id: null,
    outcome: 'success',
    summary: 'routed to @boris for standard-tier classification follow-up.',
    decisions: [
      'executor=boris (standard tier matched)',
      'skipped @ralph (free-tier, recent timeouts on classify)',
    ],
    reasoning:
      'Item is classified as task with standard complexity. Boris matches the standard tier and has 94% historical success on classify follow-ups in the last 30 days. Ralph would be cheaper but has had 3 recent timeouts on similar payloads.',
    from_status: null,
    to_status: null,
    duration_ms: 312,
    model_id: 'anthropic/claude-haiku-4-5',
    tokens_in: 188,
    tokens_out: 64,
    tokens_cached: null,
    cost_usd: 0.0003,
    error: null,
    log_lines: null,
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

  // Item G — rich agent runs to demo the AgentRunCompletedEvent shape.
  // Field coverage spans the spectrum: full data on the decompose run,
  // minimal data on the classify run (no reasoning, no tokens) — proves the
  // UI degrades for partial data without code changes.
  {
    id: activityId('e7777777-0006-0006-0006-000000000000'),
    vault_item_id: VAULT_ITEM_IDS.G,
    actor_id: actorId('boris'),
    at: '2026-04-22T11:01:30Z',
    type: 'agent_run_completed',
    skill_id: skillId('hermes/vault-classify'),
    dispatch_id: dispatchId('disp_g_classify_001'),
    outcome: 'success',
    summary: 'classified as task; routed to standard tier (boris).',
    decisions: [
      'kind=task',
      'tier=standard',
      'inferred priority P1 from "deadline" mention in body',
    ],
    reasoning: null,
    from_status: 'intake_complete',
    to_status: 'classified',
    duration_ms: 8420,
    model_id: 'anthropic/claude-haiku-4-5',
    tokens_in: 942,
    tokens_out: 187,
    tokens_cached: null,
    cost_usd: 0.0021,
    error: null,
    log_lines: null,
  },
  {
    id: activityId('e7777777-0007-0007-0007-000000000000'),
    vault_item_id: VAULT_ITEM_IDS.G,
    actor_id: actorId('boris'),
    at: '2026-04-22T11:41:30Z',
    type: 'agent_run_completed',
    skill_id: skillId('hermes/vault-decompose'),
    dispatch_id: dispatchId('disp_g_decompose_001'),
    outcome: 'success',
    summary: 'drafted 3 acceptance criteria; ready for marvin to bless.',
    decisions: [
      'AC1: command runs end-to-end on staging without manual intervention',
      'AC2: rollback path documented and tested with one-line revert',
      'AC3: log output is greppable for run id',
    ],
    reasoning:
      'Body framed this as a one-off migration but the rollback dependency makes it stateful. Drafted the rollback AC explicitly — keeps the operator from shipping without a way back. Skipped a "monitoring" AC because the change is single-shot and the existing dashboard covers it.',
    from_status: 'classified',
    to_status: 'decomposed',
    duration_ms: 26340,
    model_id: 'anthropic/claude-sonnet-4-6',
    tokens_in: 4218,
    tokens_out: 1106,
    tokens_cached: 3204,
    cost_usd: 0.0241,
    error: null,
    log_lines: null,
  },

  // ====================================================================
  // Stress-test items — minimal `created` events so every item has audit trail.
  // Items past intake also get the relevant grooming_status_changed events.
  // Items with thread messages get the paired thread_message_posted events.
  // ====================================================================

  // H — recent telegram, ungroomed
  { id: activityId('e8888888-0001-0001-0001-000000000001'), vault_item_id: VAULT_ITEM_IDS.H,
    actor_id: actorId('jimbo'), at: '2026-04-25T07:30:00Z', type: 'created' },
  // I — stale ungroomed (4 days)
  { id: activityId('e8888888-0002-0002-0002-000000000002'), vault_item_id: VAULT_ITEM_IDS.I,
    actor_id: actorId('jimbo'), at: '2026-04-21T22:14:00Z', type: 'created' },
  // J — url source
  { id: activityId('e8888888-0003-0003-0003-000000000003'), vault_item_id: VAULT_ITEM_IDS.J,
    actor_id: actorId('marvin'), at: '2026-04-24T20:00:00Z', type: 'created' },
  // K — agent spawned
  { id: activityId('e8888888-0004-0004-0004-000000000004'), vault_item_id: VAULT_ITEM_IDS.K,
    actor_id: actorId('boris'), at: '2026-04-25T03:14:00Z', type: 'created' },

  // L — 3 open questions
  { id: activityId('e8888888-0005-0005-0005-000000000005'), vault_item_id: VAULT_ITEM_IDS.L,
    actor_id: actorId('marvin'), at: '2026-04-25T02:14:00Z', type: 'created' },
  { id: activityId('e8888888-0006-0006-0006-000000000006'), vault_item_id: VAULT_ITEM_IDS.L,
    actor_id: actorId('boris'), at: '2026-04-25T02:16:00Z',
    type: 'thread_message_posted', message_id: THREAD_MESSAGE_IDS.L_Q1, message_kind: 'question' },
  { id: activityId('e8888888-0007-0007-0007-000000000007'), vault_item_id: VAULT_ITEM_IDS.L,
    actor_id: actorId('boris'), at: '2026-04-25T02:16:30Z',
    type: 'thread_message_posted', message_id: THREAD_MESSAGE_IDS.L_Q2, message_kind: 'question' },
  { id: activityId('e8888888-0008-0008-0008-000000000008'), vault_item_id: VAULT_ITEM_IDS.L,
    actor_id: actorId('boris'), at: '2026-04-25T02:17:00Z',
    type: 'thread_message_posted', message_id: THREAD_MESSAGE_IDS.L_Q3, message_kind: 'question' },

  // M — 9-day-old stale rejection
  { id: activityId('e8888888-0009-0009-0009-000000000009'), vault_item_id: VAULT_ITEM_IDS.M,
    actor_id: actorId('marvin'), at: '2026-04-16T11:00:00Z', type: 'created' },
  { id: activityId('e8888888-000a-000a-000a-00000000000a'), vault_item_id: VAULT_ITEM_IDS.M,
    actor_id: actorId('boris'), at: '2026-04-16T11:08:00Z',
    type: 'thread_message_posted', message_id: THREAD_MESSAGE_IDS.M_Q1, message_kind: 'question' },

  // N — partial answer state
  { id: activityId('e8888888-000b-000b-000b-00000000000b'), vault_item_id: VAULT_ITEM_IDS.N,
    actor_id: actorId('marvin'), at: '2026-04-22T15:00:00Z', type: 'created' },
  { id: activityId('e8888888-000c-000c-000c-00000000000c'), vault_item_id: VAULT_ITEM_IDS.N,
    actor_id: actorId('boris'), at: '2026-04-22T15:08:00Z',
    type: 'thread_message_posted', message_id: THREAD_MESSAGE_IDS.N_Q1, message_kind: 'question' },
  { id: activityId('e8888888-000d-000d-000d-00000000000d'), vault_item_id: VAULT_ITEM_IDS.N,
    actor_id: actorId('marvin'), at: '2026-04-22T16:00:00Z',
    type: 'thread_message_posted', message_id: THREAD_MESSAGE_IDS.N_A1, message_kind: 'answer' },
  { id: activityId('e8888888-000e-000e-000e-00000000000e'), vault_item_id: VAULT_ITEM_IDS.N,
    actor_id: actorId('boris'), at: '2026-04-22T16:10:00Z',
    type: 'thread_message_posted', message_id: THREAD_MESSAGE_IDS.N_Q2, message_kind: 'question' },

  // O — intake_complete (created → intake_complete)
  { id: activityId('e8888888-000f-000f-000f-00000000000f'), vault_item_id: VAULT_ITEM_IDS.O,
    actor_id: actorId('marvin'), at: '2026-04-24T16:30:00Z', type: 'created' },
  { id: activityId('e8888888-0010-0010-0010-000000000010'), vault_item_id: VAULT_ITEM_IDS.O,
    actor_id: actorId('boris'), at: '2026-04-24T16:35:00Z',
    type: 'grooming_status_changed', from: 'ungroomed', to: 'intake_complete',
    note: 'intake-quality: actionability=clear' },

  // P — email source, intake_complete
  { id: activityId('e8888888-0011-0011-0011-000000000011'), vault_item_id: VAULT_ITEM_IDS.P,
    actor_id: actorId('jimbo'), at: '2026-04-25T11:00:00Z', type: 'created' },
  { id: activityId('e8888888-0012-0012-0012-000000000012'), vault_item_id: VAULT_ITEM_IDS.P,
    actor_id: actorId('boris'), at: '2026-04-25T11:05:00Z',
    type: 'grooming_status_changed', from: 'ungroomed', to: 'intake_complete',
    note: 'intake-quality: actionability=clear' },

  // Q — P0 incident, classified fast
  { id: activityId('e8888888-0013-0013-0013-000000000013'), vault_item_id: VAULT_ITEM_IDS.Q,
    actor_id: actorId('marvin'), at: '2026-04-25T06:30:00Z', type: 'created' },
  { id: activityId('e8888888-0014-0014-0014-000000000014'), vault_item_id: VAULT_ITEM_IDS.Q,
    actor_id: actorId('jimbo'), at: '2026-04-25T06:31:00Z',
    type: 'assigned', from_actor_id: null, to_actor_id: actorId('boris'),
    reason: 'P0 incident — escalating to standard tier' },
  { id: activityId('e8888888-0015-0015-0015-000000000015'), vault_item_id: VAULT_ITEM_IDS.Q,
    actor_id: actorId('boris'), at: '2026-04-25T06:35:00Z',
    type: 'grooming_status_changed', from: 'ungroomed', to: 'classified',
    note: 'fast-tracked through intake — operator escalation' },

  // R — priority divergence (P3 ai / P1 manual), classified
  { id: activityId('e8888888-0016-0016-0016-000000000016'), vault_item_id: VAULT_ITEM_IDS.R,
    actor_id: actorId('marvin'), at: '2026-04-23T17:30:00Z', type: 'created' },
  { id: activityId('e8888888-0017-0017-0017-000000000017'), vault_item_id: VAULT_ITEM_IDS.R,
    actor_id: actorId('boris'), at: '2026-04-23T17:45:00Z',
    type: 'grooming_status_changed', from: 'ungroomed', to: 'classified',
    note: 'classify ran' },

  // S — 2 open questions, classified
  { id: activityId('e8888888-0018-0018-0018-000000000018'), vault_item_id: VAULT_ITEM_IDS.S,
    actor_id: actorId('marvin'), at: '2026-04-23T13:00:00Z', type: 'created' },
  { id: activityId('e8888888-0019-0019-0019-000000000019'), vault_item_id: VAULT_ITEM_IDS.S,
    actor_id: actorId('boris'), at: '2026-04-23T13:25:00Z',
    type: 'grooming_status_changed', from: 'ungroomed', to: 'classified',
    note: 'classify ran' },
  { id: activityId('e8888888-001a-001a-001a-00000000001a'), vault_item_id: VAULT_ITEM_IDS.S,
    actor_id: actorId('ralph'), at: '2026-04-23T13:30:00Z',
    type: 'thread_message_posted', message_id: THREAD_MESSAGE_IDS.S_Q1, message_kind: 'question' },
  { id: activityId('e8888888-001b-001b-001b-00000000001b'), vault_item_id: VAULT_ITEM_IDS.S,
    actor_id: actorId('ralph'), at: '2026-04-23T13:31:00Z',
    type: 'thread_message_posted', message_id: THREAD_MESSAGE_IDS.S_Q2, message_kind: 'question' },

  // T — decomposed, all AC done
  { id: activityId('e8888888-001c-001c-001c-00000000001c'), vault_item_id: VAULT_ITEM_IDS.T,
    actor_id: actorId('marvin'), at: '2026-04-19T14:00:00Z', type: 'created' },
  { id: activityId('e8888888-001d-001d-001d-00000000001d'), vault_item_id: VAULT_ITEM_IDS.T,
    actor_id: actorId('boris'), at: '2026-04-19T14:30:00Z',
    type: 'grooming_status_changed', from: 'ungroomed', to: 'decomposed',
    note: 'fast-pathed: trivial cosmetic; full decompose ran' },

  // U — child of G (epic edge)
  { id: activityId('e8888888-001e-001e-001e-00000000001e'), vault_item_id: VAULT_ITEM_IDS.U,
    actor_id: actorId('marvin'), at: '2026-04-23T11:30:00Z', type: 'created' },
  { id: activityId('e8888888-001f-001f-001f-00000000001f'), vault_item_id: VAULT_ITEM_IDS.U,
    actor_id: actorId('boris'), at: '2026-04-23T12:00:00Z',
    type: 'grooming_status_changed', from: 'ungroomed', to: 'decomposed',
    note: 'sub-task of #2407 — inherited classification, AC drafted' },

  // V — ready, P2 standard
  { id: activityId('e8888888-0020-0020-0020-000000000020'), vault_item_id: VAULT_ITEM_IDS.V,
    actor_id: actorId('marvin'), at: '2026-04-21T17:00:00Z', type: 'created' },
  { id: activityId('e8888888-0021-0021-0021-000000000021'), vault_item_id: VAULT_ITEM_IDS.V,
    actor_id: actorId('marvin'), at: '2026-04-22T09:00:00Z',
    type: 'grooming_status_changed', from: 'ungroomed', to: 'ready',
    note: 'manually flipped — small enough to skip the full pipeline' },

  // W — ready, P3 backlog
  { id: activityId('e8888888-0022-0022-0022-000000000022'), vault_item_id: VAULT_ITEM_IDS.W,
    actor_id: actorId('marvin'), at: '2026-04-20T09:00:00Z', type: 'created' },
  { id: activityId('e8888888-0023-0023-0023-000000000023'), vault_item_id: VAULT_ITEM_IDS.W,
    actor_id: actorId('marvin'), at: '2026-04-20T09:05:00Z',
    type: 'grooming_status_changed', from: 'ungroomed', to: 'ready',
    note: 'cosmetic — straight to ready' },

  // X — ready + done
  { id: activityId('e8888888-0024-0024-0024-000000000024'), vault_item_id: VAULT_ITEM_IDS.X,
    actor_id: actorId('marvin'), at: '2026-04-12T10:00:00Z', type: 'created' },
  { id: activityId('e8888888-0025-0025-0025-000000000025'), vault_item_id: VAULT_ITEM_IDS.X,
    actor_id: actorId('marvin'), at: '2026-04-23T17:00:00Z',
    type: 'completion_changed', from: null, to: '2026-04-23T17:00:00Z',
    note: 'shipped to prod — no rollbacks' },

  // Y — archived (was classified before)
  { id: activityId('e8888888-0026-0026-0026-000000000026'), vault_item_id: VAULT_ITEM_IDS.Y,
    actor_id: actorId('marvin'), at: '2026-04-10T09:00:00Z', type: 'created' },
  { id: activityId('e8888888-0027-0027-0027-000000000027'), vault_item_id: VAULT_ITEM_IDS.Y,
    actor_id: actorId('marvin'), at: '2026-04-15T11:00:00Z',
    type: 'archived', archived_at: '2026-04-15T11:00:00Z',
    note: 'decided against tailwind — staying with SCSS + CSS variables' },

  // Z — completed, then archived (lifecycle independence)
  { id: activityId('e8888888-0028-0028-0028-000000000028'), vault_item_id: VAULT_ITEM_IDS.Z,
    actor_id: actorId('marvin'), at: '2026-04-15T10:00:00Z', type: 'created' },
  { id: activityId('e8888888-0029-0029-0029-000000000029'), vault_item_id: VAULT_ITEM_IDS.Z,
    actor_id: actorId('marvin'), at: '2026-04-18T14:00:00Z',
    type: 'completion_changed', from: null, to: '2026-04-18T14:00:00Z',
    note: 'CI deploy live' },
  { id: activityId('e8888888-002a-002a-002a-00000000002a'), vault_item_id: VAULT_ITEM_IDS.Z,
    actor_id: actorId('marvin'), at: '2026-04-20T18:00:00Z',
    type: 'archived', archived_at: '2026-04-20T18:00:00Z',
    note: 'tidying up the done-but-not-archived backlog' },

  // AA — bookmark
  { id: activityId('e8888888-002b-002b-002b-00000000002b'), vault_item_id: VAULT_ITEM_IDS.AA,
    actor_id: actorId('marvin'), at: '2026-04-19T12:00:00Z', type: 'created' },

  // AB — note
  { id: activityId('e8888888-002c-002c-002c-00000000002c'), vault_item_id: VAULT_ITEM_IDS.AB,
    actor_id: actorId('marvin'), at: '2026-04-24T22:00:00Z', type: 'created' },

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
