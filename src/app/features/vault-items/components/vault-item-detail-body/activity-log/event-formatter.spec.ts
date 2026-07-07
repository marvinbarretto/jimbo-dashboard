import { describe, it, expect } from 'vitest';
import { formatEvent } from './event-formatter';
import type { VaultActivityEvent } from '@domain/activity/activity-event';
import { activityId, actorId, vaultItemId, threadMessageId , wellKnownActorId} from '@domain/ids';

const base = {
  id: activityId('a'),
  vault_item_id: vaultItemId('v'),
  at: '2026-04-27T10:00:00Z',
};

describe('formatEvent — standard line shape', () => {
  it('formats `created` as actor + verb', () => {
    const e: VaultActivityEvent = { ...base, type: 'created', actor_id: wellKnownActorId('marvin') };
    const r = formatEvent(e);
    expect(r.actorId).toBe('marvin');
    expect(r.verb).toBe('created');
    expect(r.target).toBeNull();
  });

  it('formats a hand-off (`assigned` with a prior owner) as `reassigned`', () => {
    const e: VaultActivityEvent = { ...base, type: 'assigned', actor_id: wellKnownActorId('marvin'), from_actor_id: wellKnownActorId('boris'), to_actor_id: wellKnownActorId('kipper'), reason: null };
    const r = formatEvent(e);
    expect(r.verb).toBe('reassigned');
    expect(r.target).toBe('kipper');
  });

  it('formats an initial assignment (no prior owner) as `assigned`, not `reassigned`', () => {
    const e: VaultActivityEvent = { ...base, type: 'assigned', actor_id: wellKnownActorId('jimbo'), from_actor_id: null, to_actor_id: wellKnownActorId('boris'), reason: null };
    const r = formatEvent(e);
    expect(r.verb).toBe('assigned');
    expect(r.target).toBe('boris');
  });

  describe('grooming_status_changed — reads as `moved x to y (z)`', () => {
    it('with note: `moved classified to decomposed (no decomposition needed)`', () => {
      const e: VaultActivityEvent = { ...base, type: 'grooming_status_changed', actor_id: wellKnownActorId('boris'), from: 'classified', to: 'decomposed', note: 'no decomposition needed' };
      const r = formatEvent(e);
      expect(r.verb).toBe('moved');
      expect(r.summary).toBe('classified to decomposed (no decomposition needed)');
      expect(r.details).toBe('classified → decomposed');
    });

    it('humanises snake_case states (intake_complete → "intake complete")', () => {
      const e: VaultActivityEvent = { ...base, type: 'grooming_status_changed', actor_id: wellKnownActorId('boris'), from: 'ungroomed', to: 'intake_complete', note: 'intake-quality: clear' };
      expect(formatEvent(e).summary).toBe('ungroomed to intake complete (intake-quality: clear)');
    });

    it('omits the parenthetical when no note', () => {
      const e: VaultActivityEvent = { ...base, type: 'grooming_status_changed', actor_id: wellKnownActorId('marvin'), from: 'decomposed', to: 'ready', note: null };
      expect(formatEvent(e).summary).toBe('decomposed to ready');
    });

    it('handles needs_rework with no note', () => {
      const e: VaultActivityEvent = { ...base, type: 'grooming_status_changed', actor_id: wellKnownActorId('marvin'), from: 'decomposed', to: 'needs_rework', note: null };
      expect(formatEvent(e).summary).toBe('decomposed to needs rework');
    });
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
      ...base, type: 'rejected', actor_id: wellKnownActorId('marvin'),
      from_status: 'decomposed', to_status: 'needs_rework',
      from_owner: wellKnownActorId('boris'), to_owner: actorId('vault-decompose'),
      reason: 'AC too verbose, retry', thread_message_id: threadMessageId('tm-1'),
    };
    const r = formatEvent(e);
    expect(r.verb).toBe('rejected');
    expect(r.target).toBe('vault-decompose');
    expect(r.summary).toContain('AC too verbose');
  });

  describe('thread_message_posted — verb varies by kind', () => {
    it('comment → "commented"', () => {
      const e: VaultActivityEvent = { ...base, type: 'thread_message_posted', actor_id: wellKnownActorId('marvin'), message_id: threadMessageId('tm-x'), message_kind: 'comment' };
      const r = formatEvent(e);
      expect(r.verb).toBe('commented');
      expect(r.scrollToMessageId).toBe('tm-x');
    });

    it('question → "asked"', () => {
      const e: VaultActivityEvent = { ...base, type: 'thread_message_posted', actor_id: wellKnownActorId('marvin'), message_id: threadMessageId('tm-x'), message_kind: 'question' };
      expect(formatEvent(e).verb).toBe('asked');
    });

    it('answer → "answered"', () => {
      const e: VaultActivityEvent = { ...base, type: 'thread_message_posted', actor_id: wellKnownActorId('marvin'), message_id: threadMessageId('tm-x'), message_kind: 'answer' };
      expect(formatEvent(e).verb).toBe('answered');
    });
  });
});
