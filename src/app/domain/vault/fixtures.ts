import type { VaultItem } from './vault-item';
import type { VaultItemProject } from './vault-item-project';
import type { VaultItemDependency } from './vault-item-dependency';
import { actorId, projectId, vaultItemId } from '@domain/ids';

// Stress-test fixture set. Each item is annotated with the scenario it exercises so
// the kanban / list / detail screens see edge cases you'd otherwise hit only in prod.
//
// Coverage matrix:
//   - every grooming column has multiple cards
//   - every priority level (P0–P3) and "no priority" is represented
//   - every source kind (manual / email / telegram / agent / url / pr-comment) has at least one item
//   - assigned + unassigned, every actor as owner
//   - low + high priority_confidence, manual ↔ ai priority divergence
//   - open questions, multiple open questions, partial-answered, blocked-by-dependency
//   - epic parent + epic child relationship
//   - completed-but-not-archived, archived-after-done, bookmark/note types
//   - overdue + future due_at, no due_at
//   - stale items (created weeks ago, no movement)

const ITEM_A = vaultItemId('11111111-1111-1111-1111-111111111111');
const ITEM_B = vaultItemId('22222222-2222-2222-2222-222222222222');
const ITEM_C = vaultItemId('33333333-3333-3333-3333-333333333333');
const ITEM_D = vaultItemId('44444444-4444-4444-4444-444444444444');
const ITEM_E = vaultItemId('55555555-5555-5555-5555-555555555555');
const ITEM_F = vaultItemId('66666666-6666-6666-6666-666666666666');
const ITEM_G = vaultItemId('77777777-7777-7777-7777-777777777777');
// Stress-test items — referenced by additional fixtures below for junctions / deps.
const ITEM_H = vaultItemId('88888888-0001-0001-0001-000000000001');
const ITEM_I = vaultItemId('88888888-0002-0002-0002-000000000002');
const ITEM_J = vaultItemId('88888888-0003-0003-0003-000000000003');
const ITEM_K = vaultItemId('88888888-0004-0004-0004-000000000004');
const ITEM_L = vaultItemId('88888888-0005-0005-0005-000000000005');
const ITEM_M = vaultItemId('88888888-0006-0006-0006-000000000006');
const ITEM_N = vaultItemId('88888888-0007-0007-0007-000000000007');
const ITEM_O = vaultItemId('88888888-0008-0008-0008-000000000008');
const ITEM_P = vaultItemId('88888888-0009-0009-0009-000000000009');
const ITEM_Q = vaultItemId('88888888-000a-000a-000a-00000000000a');
const ITEM_R = vaultItemId('88888888-000b-000b-000b-00000000000b');
const ITEM_S = vaultItemId('88888888-000c-000c-000c-00000000000c');
const ITEM_T = vaultItemId('88888888-000d-000d-000d-00000000000d');
const ITEM_U = vaultItemId('88888888-000e-000e-000e-00000000000e');
const ITEM_V = vaultItemId('88888888-000f-000f-000f-00000000000f');
const ITEM_W = vaultItemId('88888888-0010-0010-0010-000000000010');
const ITEM_X = vaultItemId('88888888-0011-0011-0011-000000000011');
const ITEM_Y = vaultItemId('88888888-0012-0012-0012-000000000012');
const ITEM_Z = vaultItemId('88888888-0013-0013-0013-000000000013');
const ITEM_AA = vaultItemId('88888888-0014-0014-0014-000000000014');
const ITEM_AB = vaultItemId('88888888-0015-0015-0015-000000000015');
// Long-stale items — exercise the staleness gradient at 30 / 50 / 90 days.
// These exist to keep the visual spectrum populated (mid-amber, deep amber,
// red ceiling) so the operator can see what each tier looks like.
const ITEM_AC = vaultItemId('88888888-0016-0016-0016-000000000016');
const ITEM_AD = vaultItemId('88888888-0017-0017-0017-000000000017');
const ITEM_AE = vaultItemId('88888888-0018-0018-0018-000000000018');

export const VAULT_ITEM_IDS = {
  A: ITEM_A,  B: ITEM_B,  C: ITEM_C,  D: ITEM_D,
  E: ITEM_E,  F: ITEM_F,  G: ITEM_G,
  H: ITEM_H,  I: ITEM_I,  J: ITEM_J,  K: ITEM_K,
  L: ITEM_L,  M: ITEM_M,  N: ITEM_N,
  O: ITEM_O,  P: ITEM_P,
  Q: ITEM_Q,  R: ITEM_R,  S: ITEM_S,
  T: ITEM_T,  U: ITEM_U,
  V: ITEM_V,  W: ITEM_W,  X: ITEM_X,
  Y: ITEM_Y,  Z: ITEM_Z,
  AA: ITEM_AA, AB: ITEM_AB,
  AC: ITEM_AC, AD: ITEM_AD, AE: ITEM_AE,
} as const;

export const VAULT_ITEMS = [
  // ========================================================================
  // INTAKE_REJECTED column — vague items with open questions
  // ========================================================================

  // A: vague telegram, 1 open question, no metadata
  {
    id: ITEM_A, seq: 2401,
    title: 'Look into that thing Sam mentioned',
    body: 'Sam said something about a venue thing. Probably worth following up.',
    type: 'task', category: null, assigned_to: null, tags: [], acceptance_criteria: [],
    grooming_status: 'intake_rejected',
    ai_priority: null, manual_priority: null, ai_rationale: null,
    priority_confidence: null, actionability: 'vague',
    parent_id: null, archived_at: null, due_at: null, completed_at: null,
    source: { kind: 'telegram', ref: 'tg-msg-88421', url: null },
    created_at: '2026-04-24T07:14:00Z',
  },

  // L: extra-vague item with 3 open questions (multi-question card test)
  {
    id: ITEM_L, seq: 2412,
    title: 'sort out the thing about the things',
    body: 'lowercase typo. nothing usable. classic 2am operator brain dump.',
    type: 'task', category: null, assigned_to: null, tags: [], acceptance_criteria: [],
    grooming_status: 'intake_rejected',
    ai_priority: null, manual_priority: null, ai_rationale: null,
    priority_confidence: null, actionability: 'vague',
    parent_id: null, archived_at: null, due_at: null, completed_at: null,
    source: { kind: 'telegram', ref: 'tg-msg-88500', url: null },
    created_at: '2026-04-25T02:14:00Z',
  },

  // M: 9 days stale, intake-quality asked, never answered (stuck signal)
  {
    id: ITEM_M, seq: 2413,
    title: 'Maybe do something about Helen\'s request',
    body: 'Helen mentioned wanting "the thing fixed". Needs context.',
    type: 'task', category: null, assigned_to: null, tags: [], acceptance_criteria: [],
    grooming_status: 'intake_rejected',
    ai_priority: null, manual_priority: null, ai_rationale: null,
    priority_confidence: null, actionability: 'vague',
    parent_id: null, archived_at: null, due_at: null, completed_at: null,
    source: { kind: 'manual', ref: 'marvin-2026-04-16', url: null },
    created_at: '2026-04-16T11:00:00Z',
  },

  // N: partial answer state — one question answered, one still open
  {
    id: ITEM_N, seq: 2414,
    title: 'New marketing copy for LocalShout landing page',
    body: 'Need updated copy for the hero + features section. Tone: punchy, hyperlocal.',
    type: 'task', category: null, assigned_to: null, tags: ['marketing'], acceptance_criteria: [],
    grooming_status: 'intake_rejected',
    ai_priority: null, manual_priority: null, ai_rationale: null,
    priority_confidence: null, actionability: 'needs-breakdown',
    parent_id: null, archived_at: null, due_at: null, completed_at: null,
    source: { kind: 'manual', ref: 'marvin-2026-04-22', url: null },
    created_at: '2026-04-22T15:00:00Z',
  },

  // ========================================================================
  // UNGROOMED column — fresh intake, intake-quality hasn't run
  // ========================================================================

  // E: gmail intake, has due_at
  {
    id: ITEM_E, seq: 2405,
    title: 'Email from Sarah re: speaker booking for Q3',
    body:
      'Sarah Mehta from the QE2 venue booking team replied. She has Sunday Sept 14 ' +
      'available, asked if we want morning or evening slot. Need to reply by end of week.',
    type: 'task', category: null, assigned_to: null, tags: [], acceptance_criteria: [],
    grooming_status: 'ungroomed',
    ai_priority: null, manual_priority: null, ai_rationale: null,
    priority_confidence: null, actionability: null,
    parent_id: null, archived_at: null,
    due_at: '2026-04-30T17:00:00Z', completed_at: null,
    source: { kind: 'email', ref: '18f3ab2c1d', url: 'https://mail.google.com/mail/u/0/#inbox/18f3ab2c1d' },
    created_at: '2026-04-25T09:14:00Z',
  },

  // H: recent telegram, no metadata at all
  {
    id: ITEM_H, seq: 2408,
    title: 'Quick note: Camry oil light came on yesterday morning',
    body: 'Probably nothing but worth checking. Booking due for service in 2 weeks anyway.',
    type: 'task', category: null, assigned_to: null, tags: [], acceptance_criteria: [],
    grooming_status: 'ungroomed',
    ai_priority: null, manual_priority: null, ai_rationale: null,
    priority_confidence: null, actionability: null,
    parent_id: null, archived_at: null, due_at: null, completed_at: null,
    source: { kind: 'telegram', ref: 'tg-msg-88550', url: null },
    created_at: '2026-04-25T07:30:00Z',
  },

  // I: stale ungroomed (4 days old)
  {
    id: ITEM_I, seq: 2409,
    title: 'Look up that wine bar Marc mentioned in Brixton',
    body: 'Something with natural wines, opens late, near the tube station. Marc said.',
    type: 'task', category: null, assigned_to: null, tags: [], acceptance_criteria: [],
    grooming_status: 'ungroomed',
    ai_priority: null, manual_priority: null, ai_rationale: null,
    priority_confidence: null, actionability: null,
    parent_id: null, archived_at: null, due_at: null, completed_at: null,
    source: { kind: 'telegram', ref: 'tg-msg-88200', url: null },
    created_at: '2026-04-21T22:14:00Z',
  },

  // J: url-sourced item with tags
  {
    id: ITEM_J, seq: 2410,
    title: 'Read: PostHog session replay vs raw recordings — analysis',
    body:
      'Long-form blog post on when to use replay vs raw. Looks relevant for the ' +
      'analytics tile work — read before scoping.',
    type: 'task', category: null, assigned_to: null, tags: ['research'], acceptance_criteria: [],
    grooming_status: 'ungroomed',
    ai_priority: null, manual_priority: null, ai_rationale: null,
    priority_confidence: null, actionability: null,
    parent_id: null, archived_at: null, due_at: null, completed_at: null,
    source: {
      kind: 'url',
      ref: 'posthog.com/blog/replay-vs-recordings',
      url: 'https://posthog.com/blog/replay-vs-recordings',
    },
    created_at: '2026-04-24T20:00:00Z',
  },

  // K: agent-spawned (boris kicked it during a benchmark)
  {
    id: ITEM_K, seq: 2411,
    title: 'Investigate qwen2.5:14b as Sonnet-tier replacement candidate',
    body:
      'Spawned during the routine model benchmark — qwen2.5:14b passed the same five ' +
      'probes Sonnet did at 1/30th the cost. Worth a deeper bake-off before promoting.',
    type: 'task', category: null, assigned_to: null, tags: ['benchmark', 'cost'], acceptance_criteria: [],
    grooming_status: 'ungroomed',
    ai_priority: null, manual_priority: null, ai_rationale: null,
    priority_confidence: null, actionability: null,
    parent_id: null, archived_at: null, due_at: null, completed_at: null,
    source: { kind: 'agent', ref: actorId('boris'), url: null },
    created_at: '2026-04-25T03:14:00Z',
  },

  // ========================================================================
  // INTAKE_COMPLETE column — past intake, awaiting classification
  // ========================================================================

  // F: clear, awaiting classify
  {
    id: ITEM_F, seq: 2406,
    title: 'Add monthly active users metric to coverage dashboard',
    body:
      'Coverage page already shows test counts and lint warnings. Operator wants a third ' +
      'tile: rolling 30-day MAU pulled from posthog. Posthog API key is in env.',
    type: 'task', category: null, assigned_to: null, tags: ['frontend', 'metrics'], acceptance_criteria: [],
    grooming_status: 'intake_complete',
    ai_priority: null, manual_priority: null, ai_rationale: null,
    priority_confidence: null, actionability: 'clear',
    parent_id: null, archived_at: null, due_at: null, completed_at: null,
    source: { kind: 'manual', ref: 'marvin-2026-04-24', url: null },
    created_at: '2026-04-24T14:00:00Z',
  },

  // O: clear, has tags, awaiting classify
  {
    id: ITEM_O, seq: 2415,
    title: 'Audit auth flow for stale-session bug Helen reported',
    body:
      'Helen reported being silently logged out after ~30min. Suspect refresh token TTL ' +
      'mismatch between proxy and api. Reproducible on Chrome.',
    type: 'task', category: null, assigned_to: null, tags: ['auth', 'bug'], acceptance_criteria: [],
    grooming_status: 'intake_complete',
    ai_priority: null, manual_priority: null, ai_rationale: null,
    priority_confidence: null, actionability: 'clear',
    parent_id: null, archived_at: null, due_at: null, completed_at: null,
    source: { kind: 'manual', ref: 'marvin-2026-04-24', url: null },
    created_at: '2026-04-24T16:30:00Z',
  },

  // P: email source, design-tagged
  {
    id: ITEM_P, seq: 2416,
    title: 'Add darker variant to brand palette per Sara\'s email',
    body: 'Sara wants a third surface tone between current bg and surface. Spec attached.',
    type: 'task', category: null, assigned_to: null, tags: ['design'], acceptance_criteria: [],
    grooming_status: 'intake_complete',
    ai_priority: null, manual_priority: null, ai_rationale: null,
    priority_confidence: null, actionability: 'clear',
    parent_id: null, archived_at: null, due_at: null, completed_at: null,
    source: {
      kind: 'email',
      ref: '18f9ce4d22',
      url: 'https://mail.google.com/mail/u/0/#inbox/18f9ce4d22',
    },
    created_at: '2026-04-25T11:00:00Z',
  },

  // ========================================================================
  // CLASSIFIED column — priority + rationale set, awaiting decompose
  // ========================================================================

  // C: cross-project, blocked by A, manual override of ai_priority
  {
    id: ITEM_C, seq: 2403,
    title: 'Wire intake-quality verdict back into vault-classify trigger',
    body:
      'Currently vault-classify runs unconditionally. Should only fire when intake-quality ' +
      'returned actionability=clear. Touches both hermes pipeline-pump and the localshout ' +
      'event-qualifier flow which depends on the same chain.',
    type: 'task', category: null, assigned_to: actorId('ralph'),
    tags: ['pipeline', 'cross-project'],
    acceptance_criteria: [
      { text: 'pipeline-pump skips classify when actionability != clear', done: true },
      { text: 'event-qualifier integration tested', done: false },
    ],
    grooming_status: 'classified',
    ai_priority: 2, manual_priority: 1,
    ai_rationale: 'Touches the dispatch chain but the bug is contained to one branch.',
    priority_confidence: 0.71, actionability: 'clear',
    parent_id: null, archived_at: null, due_at: null, completed_at: null,
    source: { kind: 'pr-comment', ref: 'hermes#142', url: 'https://github.com/marvinbarretto/hermes/pull/142' },
    created_at: '2026-04-22T16:08:00Z',
  },

  // Q: P0 emergency, low confidence, overdue
  {
    id: ITEM_Q, seq: 2417,
    title: 'URGENT: Production 500s on /api/dispatch endpoint',
    body:
      'Multiple 500s on dispatch creation since 06:00. pipeline-pump backed up. ' +
      'Likely the recent Hono middleware change. Rollback candidate.',
    type: 'task', category: null, assigned_to: actorId('boris'),
    tags: ['incident', 'backend'],
    acceptance_criteria: [],
    grooming_status: 'classified',
    ai_priority: 0, manual_priority: 0,
    ai_rationale: 'Production outage — every minute of delay costs dispatch throughput.',
    priority_confidence: 0.45, actionability: 'clear',
    parent_id: null, archived_at: null,
    due_at: '2026-04-25T12:00:00Z',     // overdue (today, before now)
    completed_at: null,
    source: { kind: 'manual', ref: 'marvin-2026-04-25', url: null },
    created_at: '2026-04-25T06:30:00Z',
  },

  // R: priority divergence (ai_priority=P3, manual_priority=P1)
  {
    id: ITEM_R, seq: 2418,
    title: 'Refactor dispatch queue reaper to use exponential backoff',
    body:
      'Current reaper retries failed dispatches with a flat 30s delay. Should use ' +
      'exponential backoff with jitter. Operator wants this — boring tech-debt to AI.',
    type: 'task', category: null, assigned_to: actorId('boris'),
    tags: ['backend', 'tech-debt'],
    acceptance_criteria: [],
    grooming_status: 'classified',
    ai_priority: 3, manual_priority: 1,
    ai_rationale: 'Backlog tech-debt; user-invisible.',
    priority_confidence: 0.55, actionability: 'clear',
    parent_id: null, archived_at: null, due_at: null, completed_at: null,
    source: { kind: 'manual', ref: 'marvin-2026-04-23', url: null },
    created_at: '2026-04-23T17:30:00Z',
  },

  // S: blocked by 2 open questions (orthogonal blocker test)
  {
    id: ITEM_S, seq: 2419,
    title: 'Add postcode-resolution fallback for Edinburgh suburbs',
    body:
      'Some EH8 postcodes fail in current resolver. Need a fallback path before the ' +
      'submission validator rejects.',
    type: 'task', category: null, assigned_to: actorId('ralph'),
    tags: ['backend', 'localshout'],
    acceptance_criteria: [],
    grooming_status: 'classified',
    ai_priority: 2, manual_priority: null,
    ai_rationale: 'Affects a small geographic subset but blocks event submissions there.',
    priority_confidence: 0.68, actionability: 'clear',
    parent_id: null, archived_at: null, due_at: null, completed_at: null,
    source: { kind: 'manual', ref: 'marvin-2026-04-23', url: null },
    created_at: '2026-04-23T13:00:00Z',
  },

  // ========================================================================
  // DECOMPOSED column — AC drafted, awaits marvin's review to flip to ready
  // ========================================================================

  // G: AC drafted, awaiting marvin (epic parent — has children below)
  {
    id: ITEM_G, seq: 2407,
    title: 'Refactor jimbo-api Hono routes to use zod request validation',
    body:
      'Current routes hand-validate request bodies with ad-hoc checks. Migrate to zod ' +
      'schemas at the route boundary so 400s are uniform. Affects all /vault-items, ' +
      '/projects, /skills endpoints.',
    type: 'task', category: null, assigned_to: actorId('boris'),
    tags: ['backend', 'tech-debt'],
    acceptance_criteria: [
      { text: 'All POST/PATCH endpoints use zod', done: false },
      { text: 'Validation errors return 400 with structured body', done: false },
      { text: 'Existing tests still pass', done: false },
    ],
    grooming_status: 'decomposed',
    ai_priority: 2, manual_priority: null,
    ai_rationale: 'Tech-debt cleanup; not user-facing but reduces bug surface across all endpoints.',
    priority_confidence: 0.78, actionability: 'clear',
    parent_id: null, archived_at: null, due_at: null, completed_at: null,
    source: { kind: 'manual', ref: 'marvin-2026-04-22', url: null },
    created_at: '2026-04-22T10:30:00Z',
  },

  // T: all AC done — visually "ready to flip" (operator just needs to click ready)
  {
    id: ITEM_T, seq: 2420,
    title: 'Wire up coverage badge in README',
    body: 'Add a coverage % badge to the README from the latest CI artefact.',
    type: 'task', category: null, assigned_to: actorId('marvin'),
    tags: ['docs'],
    acceptance_criteria: [
      { text: 'README has badge image', done: true },
      { text: 'Badge updates from CI', done: true },
      { text: 'Link points at coverage page', done: true },
    ],
    grooming_status: 'decomposed',
    ai_priority: 3, manual_priority: 3,
    ai_rationale: 'Cosmetic. No effort, low value, low risk.',
    priority_confidence: 0.92, actionability: 'clear',
    parent_id: null, archived_at: null, due_at: null, completed_at: null,
    source: { kind: 'manual', ref: 'marvin-2026-04-19', url: null },
    created_at: '2026-04-19T14:00:00Z',
  },

  // U: child of G (epic hierarchy edge)
  {
    id: ITEM_U, seq: 2421,
    title: 'Sub-task: convert /vault-items endpoint to zod schemas',
    body: 'First slice of the larger zod migration. Smallest blast radius — pilot.',
    type: 'task', category: null, assigned_to: actorId('boris'),
    tags: ['backend'],
    acceptance_criteria: [
      { text: 'POST /vault-items uses zod', done: false },
      { text: 'PATCH /vault-items uses zod', done: false },
    ],
    grooming_status: 'decomposed',
    ai_priority: 2, manual_priority: null,
    ai_rationale: 'Pilot slice of the parent zod migration.',
    priority_confidence: 0.80, actionability: 'clear',
    parent_id: ITEM_G,                  // epic edge — child of G
    archived_at: null, due_at: null, completed_at: null,
    source: { kind: 'manual', ref: 'marvin-2026-04-23', url: null },
    created_at: '2026-04-23T11:30:00Z',
  },

  // ========================================================================
  // READY column — dispatchable
  // ========================================================================

  // B: classic ready item with future due_at, full AC
  {
    id: ITEM_B, seq: 2402,
    title: 'Add postcode validation to event submission form',
    body:
      'When a user submits an event without a UK-format postcode, accept it silently. ' +
      'Should reject with inline error referencing the postcode regex used elsewhere.',
    type: 'task', category: null, assigned_to: actorId('boris'),
    tags: ['frontend', 'validation'],
    acceptance_criteria: [
      { text: 'Invalid postcode shows inline error', done: false },
      { text: 'Valid postcode passes through unchanged', done: false },
      { text: 'Regex shared with backend validator', done: false },
    ],
    grooming_status: 'ready',
    ai_priority: 1, manual_priority: 1,
    ai_rationale: 'Active form bug affecting submissions; likely silent data corruption.',
    priority_confidence: 0.82, actionability: 'clear',
    parent_id: null, archived_at: null,
    due_at: '2026-05-02T17:00:00Z', completed_at: null,
    source: { kind: 'manual', ref: 'marvin-2026-04-23', url: null },
    created_at: '2026-04-23T11:32:00Z',
  },

  // V: P2 standard, owner @boris
  {
    id: ITEM_V, seq: 2422,
    title: 'Add bulk \"mark all done\" action to vault list',
    body: 'Multi-select rows + bulk action menu. Useful for migrations and big sweeps.',
    type: 'task', category: null, assigned_to: actorId('boris'),
    tags: ['frontend'],
    acceptance_criteria: [
      { text: 'Checkbox per row', done: false },
      { text: 'Bulk action menu appears when 1+ selected', done: false },
      { text: 'Mark-done emits one event per item', done: false },
    ],
    grooming_status: 'ready',
    ai_priority: 2, manual_priority: 2,
    ai_rationale: 'Operator productivity — modest payoff, modest scope.',
    priority_confidence: 0.81, actionability: 'clear',
    parent_id: null, archived_at: null, due_at: null, completed_at: null,
    source: { kind: 'manual', ref: 'marvin-2026-04-21', url: null },
    created_at: '2026-04-21T17:00:00Z',
  },

  // W: P3 backlog ready item — sorts to the bottom of READY column
  {
    id: ITEM_W, seq: 2423,
    title: 'Tidy: rename internal prop_id to promptId for consistency',
    body: 'Existing var names are inconsistent across hermes / dashboard. Cosmetic.',
    type: 'task', category: null, assigned_to: actorId('ralph'),
    tags: ['cleanup'],
    acceptance_criteria: [
      { text: 'No occurrences of prop_id remain in src/', done: false },
    ],
    grooming_status: 'ready',
    ai_priority: 3, manual_priority: 3,
    ai_rationale: 'Pure cosmetic. Low everything.',
    priority_confidence: 0.95, actionability: 'clear',
    parent_id: null, archived_at: null, due_at: null, completed_at: null,
    source: { kind: 'manual', ref: 'marvin-2026-04-20', url: null },
    created_at: '2026-04-20T09:00:00Z',
  },

  // X: ready + done (completed but not archived — coexistence test)
  {
    id: ITEM_X, seq: 2424,
    title: 'Migrate jimbo-api auth to bearer tokens',
    body: 'Replace cookie-based auth with bearer tokens. Done last sprint.',
    type: 'task', category: null, assigned_to: actorId('marvin'),
    tags: ['backend', 'auth'],
    acceptance_criteria: [
      { text: 'All endpoints accept Bearer token', done: true },
      { text: 'Old cookie path still works for 30 days', done: true },
    ],
    grooming_status: 'ready',
    ai_priority: 1, manual_priority: 1,
    ai_rationale: 'Security upgrade — overdue.',
    priority_confidence: 0.88, actionability: 'clear',
    parent_id: null, archived_at: null, due_at: null,
    completed_at: '2026-04-23T17:00:00Z',
    source: { kind: 'manual', ref: 'marvin-2026-04-12', url: null },
    created_at: '2026-04-12T10:00:00Z',
  },

  // D: existing done item, P3 ai / P2 manual
  {
    id: ITEM_D, seq: 2404,
    title: 'Backfill source field on legacy vault items',
    body: 'One-off script to populate source=null items with `manual` where origin is unknowable.',
    type: 'task', category: null, assigned_to: actorId('marvin'),
    tags: ['migration'],
    acceptance_criteria: [
      { text: 'All null sources backfilled or explicitly left null', done: true },
    ],
    grooming_status: 'ready',
    ai_priority: 3, manual_priority: 2,
    ai_rationale: 'Tidy-up. No user-visible impact.',
    priority_confidence: 0.6, actionability: 'clear',
    parent_id: null, archived_at: null, due_at: null,
    completed_at: '2026-04-24T15:42:00Z',
    source: { kind: 'manual', ref: 'marvin-2026-04-21', url: null },
    created_at: '2026-04-21T10:00:00Z',
  },

  // ========================================================================
  // ARCHIVED + ALT TYPES — filtered from kanban; visible elsewhere
  // ========================================================================

  // Y: archived after deciding the project went a different direction
  {
    id: ITEM_Y, seq: 2425,
    title: '[obsolete] Migrate frontend to Tailwind',
    body: 'Decided against — staying with SCSS + CSS variables per the dark-theme work.',
    type: 'task', category: null, assigned_to: null,
    tags: ['rejected'],
    acceptance_criteria: [],
    grooming_status: 'classified',           // was classified before being archived
    ai_priority: 2, manual_priority: 3,
    ai_rationale: 'Significant frontend churn for marginal gain.',
    priority_confidence: 0.7, actionability: 'clear',
    parent_id: null,
    archived_at: '2026-04-15T11:00:00Z',
    due_at: null, completed_at: null,
    source: { kind: 'manual', ref: 'marvin-2026-04-10', url: null },
    created_at: '2026-04-10T09:00:00Z',
  },

  // Z: completed + archived — done, then archived (lifecycle independence test)
  {
    id: ITEM_Z, seq: 2426,
    title: 'Add GitHub Actions auto-deploy on push to master',
    body: 'CI workflow for production deploys.',
    type: 'task', category: null, assigned_to: actorId('marvin'),
    tags: ['ci', 'devops'],
    acceptance_criteria: [
      { text: 'Workflow triggers on push to master', done: true },
      { text: 'Deploys to production', done: true },
    ],
    grooming_status: 'ready',
    ai_priority: 2, manual_priority: 2,
    ai_rationale: 'Removes manual deploy friction.',
    priority_confidence: 0.85, actionability: 'clear',
    parent_id: null,
    archived_at: '2026-04-20T18:00:00Z',     // archived AFTER completing
    due_at: null,
    completed_at: '2026-04-18T14:00:00Z',    // done first…
    source: { kind: 'manual', ref: 'marvin-2026-04-15', url: null },
    created_at: '2026-04-15T10:00:00Z',
  },

  // AA: a bookmark — type='bookmark', filtered from kanban
  {
    id: ITEM_AA, seq: 2427,
    title: 'Bookmark: refactoring.guru — design patterns reference',
    body: 'Useful catalogue with code samples per pattern. Keep in vault for quick reference.',
    type: 'bookmark', category: null, assigned_to: null, tags: ['reference', 'patterns'],
    acceptance_criteria: [],
    grooming_status: 'ungroomed',            // bookmarks don't progress; field required
    ai_priority: null, manual_priority: null, ai_rationale: null,
    priority_confidence: null, actionability: null,
    parent_id: null, archived_at: null, due_at: null, completed_at: null,
    source: { kind: 'url', ref: 'refactoring.guru/design-patterns', url: 'https://refactoring.guru/design-patterns' },
    created_at: '2026-04-19T12:00:00Z',
  },

  // AB: a note — type='note', filtered from kanban
  {
    id: ITEM_AB, seq: 2428,
    title: 'Note: home page seems slow on mobile, especially on first paint',
    body:
      'On iPhone 13 over LTE, home page TTI is ~3.5s — felt slow. Worth a Lighthouse pass ' +
      'before the next round of design work.',
    type: 'note', category: null, assigned_to: null, tags: ['perf', 'observation'],
    acceptance_criteria: [],
    grooming_status: 'ungroomed',
    ai_priority: null, manual_priority: null, ai_rationale: null,
    priority_confidence: null, actionability: null,
    parent_id: null, archived_at: null, due_at: null, completed_at: null,
    source: { kind: 'manual', ref: 'marvin-2026-04-24', url: null },
    created_at: '2026-04-24T22:00:00Z',
  },

  // ========================================================================
  // Long-stale items — visual gradient demonstration (30 / 50 / 90 days)
  // ========================================================================

  // AC: 30 days old, classified, P2 — mid-gradient (entering amber→red phase).
  {
    id: ITEM_AC, seq: 2429,
    title: 'Tidy up status filter UX on vault list',
    body:
      'Filter chips on the vault list are too cramped on narrow screens. Reflow ' +
      'into a dropdown below ~640px viewport.',
    type: 'task', category: null, assigned_to: actorId('ralph'),
    tags: ['frontend', 'ux'],
    acceptance_criteria: [],
    grooming_status: 'classified',
    ai_priority: 2, manual_priority: null,
    ai_rationale: 'Quality-of-life improvement; nobody is blocked.',
    priority_confidence: 0.72, actionability: 'clear',
    parent_id: null, archived_at: null, due_at: null, completed_at: null,
    source: { kind: 'manual', ref: 'marvin-2026-03-26', url: null },
    created_at: '2026-03-26T11:00:00Z',
  },

  // AD: 50 days old, ungroomed, telegram — deep amber/red, never triaged.
  // Classic "saved a thought, never came back to it" item.
  {
    id: ITEM_AD, seq: 2430,
    title: 'Marc said something about a board games night in March',
    body: 'Vague. Probably want to follow up if interested.',
    type: 'task', category: null, assigned_to: null,
    tags: [],
    acceptance_criteria: [],
    grooming_status: 'ungroomed',
    ai_priority: null, manual_priority: null, ai_rationale: null,
    priority_confidence: null, actionability: null,
    parent_id: null, archived_at: null, due_at: null, completed_at: null,
    source: { kind: 'telegram', ref: 'tg-msg-87100', url: null },
    created_at: '2026-03-06T22:00:00Z',
  },

  // AE: 90 days old, ready but never dispatched, P3 — red ceiling.
  // The "I'll do it eventually" backlog ghost.
  {
    id: ITEM_AE, seq: 2431,
    title: 'Add favicon for the dashboard',
    body: 'Default Angular favicon still showing in tabs. Pick a small jimbo glyph and wire it.',
    type: 'task', category: null, assigned_to: actorId('marvin'),
    tags: ['design', 'cosmetic'],
    acceptance_criteria: [
      { text: 'favicon.ico replaces default Angular one', done: false },
    ],
    grooming_status: 'ready',
    ai_priority: 3, manual_priority: 3,
    ai_rationale: 'Cosmetic. Lowest priority everything.',
    priority_confidence: 0.95, actionability: 'clear',
    parent_id: null, archived_at: null, due_at: null, completed_at: null,
    source: { kind: 'manual', ref: 'marvin-2026-01-25', url: null },
    created_at: '2026-01-25T10:00:00Z',
  },
] as const satisfies readonly VaultItem[];

// Project linkage. Every item has at least one project — operator-life items
// land under `personal` rather than being unlinked.
export const VAULT_ITEM_PROJECTS = [
  // Software-project items
  { vault_item_id: ITEM_B, project_id: projectId('localshout') },
  { vault_item_id: ITEM_C, project_id: projectId('localshout') },
  { vault_item_id: ITEM_C, project_id: projectId('hermes') },        // cross-project
  { vault_item_id: ITEM_D, project_id: projectId('localshout') },
  { vault_item_id: ITEM_F, project_id: projectId('dashboard') },     // MAU coverage tile
  { vault_item_id: ITEM_G, project_id: projectId('hermes') },        // zod refactor (api)
  { vault_item_id: ITEM_J, project_id: projectId('dashboard') },     // posthog research → analytics tile
  { vault_item_id: ITEM_K, project_id: projectId('hermes') },        // model bake-off
  { vault_item_id: ITEM_N, project_id: projectId('localshout') },    // marketing copy
  { vault_item_id: ITEM_O, project_id: projectId('dashboard') },     // auth flow audit
  { vault_item_id: ITEM_P, project_id: projectId('dashboard') },     // brand palette
  { vault_item_id: ITEM_Q, project_id: projectId('hermes') },        // prod 500s
  { vault_item_id: ITEM_R, project_id: projectId('hermes') },        // reaper backoff
  { vault_item_id: ITEM_S, project_id: projectId('localshout') },    // edinburgh postcodes
  { vault_item_id: ITEM_T, project_id: projectId('dashboard') },     // coverage badge
  { vault_item_id: ITEM_U, project_id: projectId('hermes') },        // zod child
  { vault_item_id: ITEM_V, project_id: projectId('dashboard') },     // bulk action
  { vault_item_id: ITEM_W, project_id: projectId('dashboard') },     // prop_id rename
  { vault_item_id: ITEM_X, project_id: projectId('hermes') },        // jwt bearer (done)
  { vault_item_id: ITEM_Y, project_id: projectId('dashboard') },     // archived tailwind
  { vault_item_id: ITEM_Z, project_id: projectId('hermes') },        // gh actions (done+archived)
  { vault_item_id: ITEM_AB, project_id: projectId('dashboard') },    // home page slow note
  { vault_item_id: ITEM_AC, project_id: projectId('dashboard') },    // 30d filter UX
  { vault_item_id: ITEM_AE, project_id: projectId('dashboard') },    // 90d favicon

  // Life-admin items
  { vault_item_id: ITEM_A, project_id: projectId('personal') },      // sam venue thing
  { vault_item_id: ITEM_E, project_id: projectId('personal') },      // sarah Q3 booking
  { vault_item_id: ITEM_H, project_id: projectId('personal') },      // camry oil light
  { vault_item_id: ITEM_I, project_id: projectId('personal') },      // wine bar brixton
  { vault_item_id: ITEM_L, project_id: projectId('personal') },      // vague brain dump
  { vault_item_id: ITEM_M, project_id: projectId('personal') },      // helen request
  { vault_item_id: ITEM_AA, project_id: projectId('personal') },     // refactoring guru bookmark
  { vault_item_id: ITEM_AD, project_id: projectId('personal') },     // 50d board games
] as const satisfies readonly VaultItemProject[];

// Dependencies. A blocks C (existing). Q (prod incident) blocks R (reaper backoff) — can't
// fix the design until we've stabilised the immediate failure.
export const VAULT_ITEM_DEPENDENCIES = [
  {
    blocker_id: ITEM_A,
    blocked_id: ITEM_C,
    created_at: '2026-04-23T09:00:00Z',
  },
  {
    blocker_id: ITEM_Q,
    blocked_id: ITEM_R,
    created_at: '2026-04-25T07:00:00Z',
  },
] as const satisfies readonly VaultItemDependency[];
