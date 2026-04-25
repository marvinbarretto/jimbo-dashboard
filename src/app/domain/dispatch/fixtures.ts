import type { DispatchQueueEntry } from './dispatch-queue-entry';
import { actorId, dispatchId, skillId } from '../ids';
import { VAULT_ITEM_IDS } from '../vault/fixtures';

// Three dispatches:
//   - completed intake-quality on A (the run that produced the open question)
//   - running vault-decompose on B (the active dispatch the dashboard would surface)
//   - failed event-qualifier on C (operator could retry)

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
] as const satisfies readonly DispatchQueueEntry[];
