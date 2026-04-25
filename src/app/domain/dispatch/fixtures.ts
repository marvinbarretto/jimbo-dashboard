import type { DispatchQueueEntry } from './dispatch-queue-entry';
import { actorId, dispatchId, skillId } from '../ids';
import { VAULT_ITEM_IDS } from '../vault/fixtures';

// Spread across all five DispatchStatus columns so the execution kanban has
// realistic content per state. Ordering reflects "what hermes' pipeline-pump
// would have queued first": old completed runs at the top of history, recent
// queued items at the bottom.

export const DISPATCH_ENTRIES = [
  {
    id: dispatchId('d1111111-1111-1111-1111-111111111111'),
    task_id: VAULT_ITEM_IDS.A,
    skill: skillId('hermes/intake-quality'),
    status: 'completed',
    executor: actorId('boris'),
    started_at: '2026-04-24T07:15:00Z',
    completed_at: '2026-04-24T07:16:00Z',
    retry_count: 0,
    skill_context: { body: 'Sam said something about a venue thing.' },
    result_summary: 'verdict=vague; 1 clarifying question posted',
    error: null,
    created_at: '2026-04-24T07:14:30Z',
  },
  {
    id: dispatchId('d2222222-2222-2222-2222-222222222222'),
    task_id: VAULT_ITEM_IDS.B,
    skill: skillId('hermes/vault-decompose'),
    status: 'running',
    executor: actorId('boris'),
    started_at: '2026-04-23T11:50:00Z',
    completed_at: null,
    retry_count: 0,
    skill_context: { body: 'Add postcode validation...' },
    result_summary: null,
    error: null,
    created_at: '2026-04-23T11:48:00Z',
  },
  {
    id: dispatchId('d3333333-3333-3333-3333-333333333333'),
    task_id: VAULT_ITEM_IDS.C,
    skill: skillId('localshout/event-qualifier'),
    status: 'failed',
    executor: actorId('ralph'),
    started_at: '2026-04-23T09:10:00Z',
    completed_at: '2026-04-23T09:11:00Z',
    retry_count: 2,
    skill_context: { html: '<event>...</event>' },
    result_summary: null,
    error: 'OllamaConnectionError: connection refused at 127.0.0.1:11434',
    created_at: '2026-04-23T09:09:00Z',
  },

  // --- approved (queued) ---
  // F is intake_complete, awaiting vault-classify
  {
    id: dispatchId('d4444444-4444-4444-4444-444444444444'),
    task_id: VAULT_ITEM_IDS.F,
    skill: skillId('hermes/vault-classify'),
    status: 'approved',
    executor: actorId('boris'),
    started_at: null,
    completed_at: null,
    retry_count: 0,
    skill_context: { body: 'Add monthly active users metric to coverage dashboard...' },
    result_summary: null,
    error: null,
    created_at: '2026-04-25T11:30:00Z',
  },
  // R is classified, awaiting vault-decompose
  {
    id: dispatchId('d5555555-5555-5555-5555-555555555555'),
    task_id: VAULT_ITEM_IDS.R,
    skill: skillId('hermes/vault-decompose'),
    status: 'approved',
    executor: actorId('boris'),
    started_at: null,
    completed_at: null,
    retry_count: 0,
    skill_context: { body: 'Refactor dispatch queue reaper to use exponential backoff...' },
    result_summary: null,
    error: null,
    created_at: '2026-04-25T08:00:00Z',
  },

  // --- dispatching (claim in-flight) ---
  // E just landed from gmail; intake-quality being claimed
  {
    id: dispatchId('d6666666-6666-6666-6666-666666666666'),
    task_id: VAULT_ITEM_IDS.E,
    skill: skillId('hermes/intake-quality'),
    status: 'dispatching',
    executor: actorId('boris'),
    started_at: null,
    completed_at: null,
    retry_count: 0,
    skill_context: { body: 'Sarah Mehta from QE2 venue booking team replied...' },
    result_summary: null,
    error: null,
    created_at: '2026-04-25T09:15:00Z',
  },

  // --- running (additional) ---
  // H telegram just arrived; intake-quality running on it
  {
    id: dispatchId('d7777777-7777-7777-7777-777777777777'),
    task_id: VAULT_ITEM_IDS.H,
    skill: skillId('hermes/intake-quality'),
    status: 'running',
    executor: actorId('boris'),
    started_at: '2026-04-25T07:32:00Z',
    completed_at: null,
    retry_count: 0,
    skill_context: { body: 'Quick note: Camry oil light came on yesterday morning...' },
    result_summary: null,
    error: null,
    created_at: '2026-04-25T07:31:00Z',
  },

  // --- completed (additional) ---
  // The vault-classify run on C that set ai_priority=2 + rationale
  {
    id: dispatchId('d8888888-8888-8888-8888-888888888888'),
    task_id: VAULT_ITEM_IDS.C,
    skill: skillId('hermes/vault-classify'),
    status: 'completed',
    executor: actorId('boris'),
    started_at: '2026-04-23T09:03:00Z',
    completed_at: '2026-04-23T09:04:00Z',
    retry_count: 0,
    skill_context: { body: 'Wire intake-quality verdict back into vault-classify trigger...' },
    result_summary: 'ai_priority=2; confidence=0.71',
    error: null,
    created_at: '2026-04-23T09:02:30Z',
  },
  // The intake-quality run on F that flipped it to intake_complete
  {
    id: dispatchId('d9999999-9999-9999-9999-999999999999'),
    task_id: VAULT_ITEM_IDS.F,
    skill: skillId('hermes/intake-quality'),
    status: 'completed',
    executor: actorId('boris'),
    started_at: '2026-04-24T14:06:00Z',
    completed_at: '2026-04-24T14:07:00Z',
    retry_count: 0,
    skill_context: { body: 'Coverage page already shows test counts and lint warnings...' },
    result_summary: 'verdict=clear',
    error: null,
    created_at: '2026-04-24T14:05:30Z',
  },

  // --- failed (additional) ---
  // Q is the prod-500s incident; vault-classify failed once already (LLM timeout)
  {
    id: dispatchId('daaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
    task_id: VAULT_ITEM_IDS.Q,
    skill: skillId('hermes/vault-classify'),
    status: 'failed',
    executor: actorId('boris'),
    started_at: '2026-04-25T06:34:00Z',
    completed_at: '2026-04-25T06:35:30Z',
    retry_count: 1,
    skill_context: { body: 'URGENT: Production 500s on /api/dispatch endpoint...' },
    result_summary: null,
    error: 'AnthropicTimeoutError: request exceeded 30s budget',
    created_at: '2026-04-25T06:33:00Z',
  },
] as const satisfies readonly DispatchQueueEntry[];
