import type { VaultItem } from './vault-item';
import type { VaultItemProject } from './vault-item-project';
import type { VaultItemDependency } from './vault-item-dependency';
import { actorId, projectId, vaultItemId } from '../ids';

// Seven items, one per kanban column (plus extras):
//   A (#2401) — intake_rejected, vague, has open question. Blocked.
//   B (#2402) — ready, fully groomed, awaiting dispatch.
//   C (#2403) — classified, blocked by A. Cross-project (localshout + hermes).
//   D (#2404) — ready + done. Completed item; useful for "what shipped?" projections.
//   E (#2405) — ungroomed. Just landed from gmail intake; intake-quality hasn't run.
//   F (#2406) — intake_complete. Past intake gate, awaiting classification.
//   G (#2407) — decomposed. Past classification + decomposition, pre-marvin-review.

const ITEM_A = vaultItemId('11111111-1111-1111-1111-111111111111');
const ITEM_B = vaultItemId('22222222-2222-2222-2222-222222222222');
const ITEM_C = vaultItemId('33333333-3333-3333-3333-333333333333');
const ITEM_D = vaultItemId('44444444-4444-4444-4444-444444444444');
const ITEM_E = vaultItemId('55555555-5555-5555-5555-555555555555');
const ITEM_F = vaultItemId('66666666-6666-6666-6666-666666666666');
const ITEM_G = vaultItemId('77777777-7777-7777-7777-777777777777');

export const VAULT_ITEM_IDS = {
  A: ITEM_A,
  B: ITEM_B,
  C: ITEM_C,
  D: ITEM_D,
  E: ITEM_E,
  F: ITEM_F,
  G: ITEM_G,
} as const;

export const VAULT_ITEMS = [
  {
    id: ITEM_A,
    seq: 2401,
    title: 'Look into that thing Sam mentioned',
    body: 'Sam said something about a venue thing. Probably worth following up.',
    type: 'task',
    assigned_to: null,
    tags: [],
    acceptance_criteria: [],
    grooming_status: 'intake_rejected',
    ai_priority: null,
    manual_priority: null,
    ai_rationale: null,
    priority_confidence: null,
    actionability: 'vague',
    parent_id: null,
    archived_at: null,
    due_at: null,
    completed_at: null,
    source: { kind: 'telegram', ref: 'tg-msg-88421', url: null },
    created_at: '2026-04-24T07:14:00Z',
  },
  {
    id: ITEM_B,
    seq: 2402,
    title: 'Add postcode validation to event submission form',
    body:
      'When a user submits an event without a UK-format postcode, accept it silently. ' +
      'Should reject with inline error referencing the postcode regex used elsewhere.',
    type: 'task',
    assigned_to: actorId('boris'),
    tags: ['frontend', 'validation'],
    acceptance_criteria: [
      { text: 'Invalid postcode shows inline error', done: false },
      { text: 'Valid postcode passes through unchanged', done: false },
      { text: 'Regex shared with backend validator', done: false },
    ],
    grooming_status: 'ready',
    ai_priority: 1,
    manual_priority: 1,
    ai_rationale: 'Active form bug affecting submissions; likely silent data corruption.',
    priority_confidence: 0.82,
    actionability: 'clear',
    parent_id: null,
    archived_at: null,
    due_at: '2026-05-02T17:00:00Z',
    completed_at: null,
    source: { kind: 'manual', ref: 'marvin-2026-04-23', url: null },
    created_at: '2026-04-23T11:32:00Z',
  },
  {
    id: ITEM_C,
    seq: 2403,
    title: 'Wire intake-quality verdict back into vault-classify trigger',
    body:
      'Currently vault-classify runs unconditionally. Should only fire when intake-quality ' +
      'returned actionability=clear. Touches both hermes pipeline-pump and the localshout ' +
      'event-qualifier flow which depends on the same chain.',
    type: 'task',
    assigned_to: actorId('ralph'),
    tags: ['pipeline', 'cross-project'],
    acceptance_criteria: [
      { text: 'pipeline-pump skips classify when actionability != clear', done: true },
      { text: 'event-qualifier integration tested', done: false },
    ],
    grooming_status: 'classified',
    ai_priority: 2,
    manual_priority: 1,
    ai_rationale: 'Touches the dispatch chain but the bug is contained to one branch.',
    priority_confidence: 0.71,
    actionability: 'clear',
    parent_id: null,
    archived_at: null,
    due_at: null,
    completed_at: null,
    source: { kind: 'pr-comment', ref: 'hermes#142', url: 'https://github.com/marvinbarretto/hermes/pull/142' },
    created_at: '2026-04-22T16:08:00Z',
  },
  {
    id: ITEM_D,
    seq: 2404,
    title: 'Backfill source field on legacy vault items',
    body: 'One-off script to populate source=null items with `manual` where origin is unknowable.',
    type: 'task',
    assigned_to: actorId('marvin'),
    tags: ['migration'],
    acceptance_criteria: [
      { text: 'All null sources backfilled or explicitly left null', done: true },
    ],
    grooming_status: 'ready',
    ai_priority: 3,
    manual_priority: 2,
    ai_rationale: 'Tidy-up. No user-visible impact.',
    priority_confidence: 0.6,
    actionability: 'clear',
    parent_id: null,
    archived_at: null,
    due_at: null,
    completed_at: '2026-04-24T15:42:00Z',
    source: { kind: 'manual', ref: 'marvin-2026-04-21', url: null },
    created_at: '2026-04-21T10:00:00Z',
  },
  // Item E: just landed from gmail intake. Nothing has run yet.
  {
    id: ITEM_E,
    seq: 2405,
    title: 'Email from Sarah re: speaker booking for Q3',
    body:
      'Sarah Mehta from the QE2 venue booking team replied. She has Sunday Sept 14 ' +
      'available, asked if we want morning or evening slot. Need to reply by end of week.',
    type: 'task',
    assigned_to: null,
    tags: [],
    acceptance_criteria: [],
    grooming_status: 'ungroomed',
    ai_priority: null,
    manual_priority: null,
    ai_rationale: null,
    priority_confidence: null,
    actionability: null,
    parent_id: null,
    archived_at: null,
    due_at: '2026-04-30T17:00:00Z',
    completed_at: null,
    source: { kind: 'email', ref: '18f3ab2c1d', url: 'https://mail.google.com/mail/u/0/#inbox/18f3ab2c1d' },
    created_at: '2026-04-25T09:14:00Z',
  },
  // Item F: through intake-quality, awaiting classification.
  {
    id: ITEM_F,
    seq: 2406,
    title: 'Add monthly active users metric to coverage dashboard',
    body:
      'Coverage page already shows test counts and lint warnings. Operator wants a third ' +
      'tile: rolling 30-day MAU pulled from posthog. Posthog API key is in env.',
    type: 'task',
    assigned_to: null,
    tags: ['frontend', 'metrics'],
    acceptance_criteria: [],
    grooming_status: 'intake_complete',
    ai_priority: null,
    manual_priority: null,
    ai_rationale: null,
    priority_confidence: null,
    actionability: 'clear',
    parent_id: null,
    archived_at: null,
    due_at: null,
    completed_at: null,
    source: { kind: 'manual', ref: 'marvin-2026-04-24', url: null },
    created_at: '2026-04-24T14:00:00Z',
  },
  // Item G: classified + decomposed, awaits marvin's review before flipping to ready.
  {
    id: ITEM_G,
    seq: 2407,
    title: 'Refactor jimbo-api Hono routes to use zod request validation',
    body:
      'Current routes hand-validate request bodies with ad-hoc checks. Migrate to zod ' +
      'schemas at the route boundary so 400s are uniform. Affects all /vault-items, ' +
      '/projects, /skills endpoints.',
    type: 'task',
    assigned_to: actorId('boris'),
    tags: ['backend', 'tech-debt'],
    acceptance_criteria: [
      { text: 'All POST/PATCH endpoints use zod', done: false },
      { text: 'Validation errors return 400 with structured body', done: false },
      { text: 'Existing tests still pass', done: false },
    ],
    grooming_status: 'decomposed',
    ai_priority: 2,
    manual_priority: null,
    ai_rationale: 'Tech-debt cleanup; not user-facing but reduces bug surface across all endpoints.',
    priority_confidence: 0.78,
    actionability: 'clear',
    parent_id: null,
    archived_at: null,
    due_at: null,
    completed_at: null,
    source: { kind: 'manual', ref: 'marvin-2026-04-22', url: null },
    created_at: '2026-04-22T10:30:00Z',
  },
] as const satisfies readonly VaultItem[];

// Project linkage. C is cross-project — exercises the junction's reason for existing.
export const VAULT_ITEM_PROJECTS = [
  { vault_item_id: ITEM_B, project_id: projectId('localshout') },
  { vault_item_id: ITEM_C, project_id: projectId('localshout') },
  { vault_item_id: ITEM_C, project_id: projectId('hermes') },
  { vault_item_id: ITEM_D, project_id: projectId('localshout') },
  { vault_item_id: ITEM_F, project_id: projectId('hermes') },
  { vault_item_id: ITEM_G, project_id: projectId('hermes') },
] as const satisfies readonly VaultItemProject[];

// A blocks C. Exercises the unresolved_blockers readiness check.
export const VAULT_ITEM_DEPENDENCIES = [
  {
    blocker_id: ITEM_A,
    blocked_id: ITEM_C,
    created_at: '2026-04-23T09:00:00Z',
  },
] as const satisfies readonly VaultItemDependency[];
