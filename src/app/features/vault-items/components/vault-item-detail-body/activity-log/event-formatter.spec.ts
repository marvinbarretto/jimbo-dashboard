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

/**
 * The execution half of an item's life. Every one of these actions has always
 * been written to note_activity; the mapper had no case for them, so a
 * delivered-and-filed item read as groomed and then abandoned — #2620 showed a
 * history ending 71 days ago while its two newest rows were the delivery and
 * Marvin filing it that morning.
 */
describe('formatEvent — review decisions', () => {
  const base = {
    id: activityId('a1'),
    at: '2026-08-29T11:46:43Z',
    vault_item_id: vaultItemId('note_x'),
    actor_id: actorId('marvin'),
  } as const;

  it('keeps done-unreviewed and approved distinguishable', () => {
    const filed = formatEvent({ ...base, type: 'review_decided', disposition: 'done_unreviewed', reason: 'output, not a decision' });
    const approved = formatEvent({ ...base, type: 'review_decided', disposition: 'approved', reason: null });

    expect(filed.verb).toBe('marked done, unreviewed');
    expect(filed.summary).toContain('output, not a decision');
    expect(approved.verb).toBe('approved');
    // Both end at done; the review gate exists to record which one happened.
    expect(filed.verb).not.toBe(approved.verb);
  });

  it('names the other two dispositions', () => {
    expect(formatEvent({ ...base, type: 'review_decided', disposition: 'archived', reason: null }).verb).toBe('archived');
    expect(formatEvent({ ...base, type: 'review_decided', disposition: 'sent_back', reason: null }).verb).toBe('sent back');
  });
});

/**
 * The server writes `status_changed` on every status transition — 3,099 rows,
 * none of which reached a timeline, because the mapper only knew about a
 * `completion_changed` event the dashboard invents optimistically and the API
 * has never written once.
 */
describe('formatEvent — done and reopened', () => {
  const b = {
    id: activityId('c1'),
    at: '2026-08-30T12:00:00Z',
    vault_item_id: vaultItemId('note_y'),
    actor_id: actorId('marvin'),
  } as const;

  it('says "marked done", matching the button and the state name', () => {
    const line = formatEvent({ ...b, type: 'completion_changed', from: 'active', to: 'done', note: null });
    // Not "completed": done is what the button, the status column and the
    // review dispositions all call it. A synonym makes one act look like two.
    expect(line.verb).toBe('marked done');
  });

  it('names the reverse', () => {
    expect(formatEvent({ ...b, type: 'completion_changed', from: 'done', to: null, note: null }).verb)
      .toBe('reopened');
  });
});
