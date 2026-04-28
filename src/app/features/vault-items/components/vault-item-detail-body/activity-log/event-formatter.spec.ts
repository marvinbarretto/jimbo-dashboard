import { describe, it, expect } from 'vitest';
import { formatEvent } from './event-formatter';
import type { VaultActivityEvent } from '@domain/activity/activity-event';
import { activityId, actorId, vaultItemId, threadMessageId } from '@domain/ids';

const base = {
  id: activityId('a'),
  vault_item_id: vaultItemId('v'),
  at: '2026-04-27T10:00:00Z',
};

describe('formatEvent — standard line shape', () => {
  it('formats `created` as actor + verb', () => {
    const e: VaultActivityEvent = { ...base, type: 'created', actor_id: actorId('marvin') };
    const r = formatEvent(e);
    expect(r.actorId).toBe('marvin');
    expect(r.verb).toBe('created');
    expect(r.target).toBeNull();
  });

  it('formats `assigned` with from→to', () => {
    const e: VaultActivityEvent = { ...base, type: 'assigned', actor_id: actorId('marvin'), from_actor_id: actorId('boris'), to_actor_id: actorId('ralph'), reason: null };
    const r = formatEvent(e);
    expect(r.verb).toBe('reassigned');
    expect(r.target).toBe('ralph');
  });

  it('formats `grooming_status_changed` as a transition', () => {
    const e: VaultActivityEvent = { ...base, type: 'grooming_status_changed', actor_id: actorId('marvin'), from: 'classified', to: 'decomposed', note: null };
    const r = formatEvent(e);
    expect(r.verb).toBe('moved');
    expect(r.summary).toMatch(/classified.*→.*decomposed/);
  });

  it('formats `agent_run_completed`', () => {
    const e: VaultActivityEvent = {
      ...base, type: 'agent_run_completed', actor_id: actorId('vault-decompose'),
      skill_id: 'hermes/vault-decompose' as any, dispatch_id: null, outcome: 'success',
      summary: 'drafted 3 acceptance criteria', decisions: null, reasoning: null,
      from_status: 'classified', to_status: 'decomposed',
      duration_ms: null, model_id: null, tokens_in: null, tokens_out: null, tokens_cached: null, cost_usd: null,
      error: null, log_lines: null,
    };
    const r = formatEvent(e);
    expect(r.verb).toBe('ran');
    expect(r.summary).toContain('drafted 3 acceptance criteria');
  });

  it('formats `rejected` with target and reason', () => {
    const e: VaultActivityEvent = {
      ...base, type: 'rejected', actor_id: actorId('marvin'),
      from_status: 'decomposed', to_status: 'needs_rework',
      from_owner: actorId('boris'), to_owner: actorId('vault-decompose'),
      reason: 'AC too verbose, retry', thread_message_id: threadMessageId('tm-1'),
    };
    const r = formatEvent(e);
    expect(r.verb).toBe('rejected');
    expect(r.target).toBe('vault-decompose');
    expect(r.summary).toContain('AC too verbose');
  });

  it('formats `thread_message_posted`', () => {
    const e: VaultActivityEvent = {
      ...base, type: 'thread_message_posted', actor_id: actorId('marvin'),
      message_id: threadMessageId('tm-x'), message_kind: 'comment',
    };
    const r = formatEvent(e);
    expect(r.verb).toBe('posted comment');
    expect(r.scrollToMessageId).toBe('tm-x');
  });
});
