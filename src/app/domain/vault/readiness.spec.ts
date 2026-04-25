import { computeReadiness, effectivePriority, isEpic, type OpenBlocker } from './readiness';
import { buildVaultItem, buildReady } from './vault-item.test-helpers';
import { actorId, vaultItemId, threadMessageId } from '../ids';
import type { ThreadMessage, ThreadMessageKind } from '../thread/thread-message';

let _msgCounter = 0;
function buildQuestion(overrides: Partial<ThreadMessage> = {}): ThreadMessage {
  _msgCounter++;
  return {
    id:              threadMessageId(`q-${_msgCounter}`),
    vault_item_id:   vaultItemId('00000000-0000-0000-0000-000000000001'),
    author_actor_id: actorId('boris'),
    kind:            'question' as ThreadMessageKind,
    body:            'why?',
    in_reply_to:     null,
    answered_by:     null,
    created_at:      '2026-04-25T00:00:00Z',
    ...overrides,
  };
}

describe('computeReadiness', () => {
  describe('verdict', () => {
    it('ready: all checks pass on a fully-groomed item', () => {
      const item = buildReady();
      const r = computeReadiness(item);
      expect(r.verdict).toBe('ready');
      expect(r.passed).toBe(r.total);
    });

    it('not_ready: 1-2 checks miss', () => {
      // missing AC + assigned, but has priority + grooming_status=ready
      const item = buildReady({ acceptance_criteria: [], assigned_to: null });
      const r = computeReadiness(item);
      expect(r.verdict).toBe('not_ready');
      expect(r.total - r.passed).toBeGreaterThanOrEqual(1);
      expect(r.total - r.passed).toBeLessThanOrEqual(2);
    });

    it('blocked: 3+ checks miss', () => {
      // bare item — fails every base check
      const item = buildVaultItem();
      const r = computeReadiness(item);
      expect(r.verdict).toBe('blocked');
      expect(r.total - r.passed).toBeGreaterThanOrEqual(3);
    });
  });

  describe('base checks', () => {
    it('acceptance_criteria fails when array empty', () => {
      const item = buildVaultItem({ acceptance_criteria: [] });
      const r = computeReadiness(item);
      const ac = r.checks.find(c => c.key === 'acceptance_criteria');
      expect(ac?.ok).toBe(false);
      expect(ac?.blocker).not.toBeNull();
    });

    it('acceptance_criteria passes with one criterion', () => {
      const item = buildVaultItem({ acceptance_criteria: [{ text: 'foo', done: false }] });
      const r = computeReadiness(item);
      expect(r.checks.find(c => c.key === 'acceptance_criteria')?.ok).toBe(true);
    });

    it('assigned passes when assigned_to is set', () => {
      const item = buildVaultItem({ assigned_to: actorId('marvin') });
      const r = computeReadiness(item);
      expect(r.checks.find(c => c.key === 'assigned')?.ok).toBe(true);
    });

    it('priority passes if either ai or manual is set', () => {
      const aiOnly     = buildVaultItem({ ai_priority: 2, manual_priority: null });
      const manualOnly = buildVaultItem({ ai_priority: null, manual_priority: 1 });
      expect(computeReadiness(aiOnly).checks.find(c => c.key === 'priority')?.ok).toBe(true);
      expect(computeReadiness(manualOnly).checks.find(c => c.key === 'priority')?.ok).toBe(true);
    });

    it('priority fails when both are null', () => {
      const item = buildVaultItem({ ai_priority: null, manual_priority: null });
      expect(computeReadiness(item).checks.find(c => c.key === 'priority')?.ok).toBe(false);
    });

    it('grooming_complete passes only when status is ready', () => {
      const ready = buildVaultItem({ grooming_status: 'ready' });
      const other = buildVaultItem({ grooming_status: 'classified' });
      expect(computeReadiness(ready).checks.find(c => c.key === 'grooming_complete')?.ok).toBe(true);
      expect(computeReadiness(other).checks.find(c => c.key === 'grooming_complete')?.ok).toBe(false);
    });
  });

  describe('conditional checks', () => {
    it('open_questions check is absent when there are no questions', () => {
      const r = computeReadiness(buildReady(), []);
      expect(r.checks.find(c => c.key === 'open_questions')).toBeUndefined();
    });

    it('open_questions check appears when an unanswered question exists', () => {
      const r = computeReadiness(buildReady(), [buildQuestion({ answered_by: null })]);
      const oq = r.checks.find(c => c.key === 'open_questions');
      expect(oq).toBeDefined();
      expect(oq?.ok).toBe(false);
    });

    it('open_questions check is absent when every question is answered', () => {
      const r = computeReadiness(buildReady(), [buildQuestion({ answered_by: 'msg-answer' as ThreadMessage['id'] })]);
      expect(r.checks.find(c => c.key === 'open_questions')).toBeUndefined();
    });

    it('unresolved_blockers check appears only when blockers given', () => {
      const blocker: OpenBlocker = { blocker_id: 'x', blocker_seq: 1820, blocker_title: 'fix Q' };
      const withBlocker = computeReadiness(buildReady(), [], [blocker]);
      const without     = computeReadiness(buildReady(), [], []);
      expect(withBlocker.checks.find(c => c.key === 'unresolved_blockers')?.ok).toBe(false);
      expect(without.checks.find(c => c.key === 'unresolved_blockers')).toBeUndefined();
    });

    it('unresolved_blockers blocker message lists the blocker seq', () => {
      const r = computeReadiness(buildReady(), [], [
        { blocker_id: 'a', blocker_seq: 1820, blocker_title: 'A' },
        { blocker_id: 'b', blocker_seq: 1821, blocker_title: 'B' },
      ]);
      const ub = r.checks.find(c => c.key === 'unresolved_blockers');
      expect(ub?.blocker).toContain('#1820');
      expect(ub?.blocker).toContain('#1821');
    });
  });

  describe('blocker count escalates verdict to blocked', () => {
    it('an otherwise-ready item with open question + blocker is not blocked yet (2 misses)', () => {
      const r = computeReadiness(
        buildReady(),
        [buildQuestion()],
        [{ blocker_id: 'x', blocker_seq: 1, blocker_title: 'x' }],
      );
      expect(r.verdict).toBe('not_ready');
    });
  });
});

describe('effectivePriority', () => {
  it('returns manual when set', () => {
    const item = buildVaultItem({ ai_priority: 3, manual_priority: 0 });
    expect(effectivePriority(item)).toBe(0);
  });

  it('falls through to ai when manual is null', () => {
    const item = buildVaultItem({ ai_priority: 2, manual_priority: null });
    expect(effectivePriority(item)).toBe(2);
  });

  it('returns null when both are null', () => {
    const item = buildVaultItem({ ai_priority: null, manual_priority: null });
    expect(effectivePriority(item)).toBeNull();
  });
});

describe('isEpic', () => {
  it('true when child count > 0', () => {
    expect(isEpic(1)).toBe(true);
    expect(isEpic(5)).toBe(true);
  });

  it('false when child count is 0', () => {
    expect(isEpic(0)).toBe(false);
  });
});
