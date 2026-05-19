import { describe, it, expect } from 'vitest';
import { computeNextAction } from './next-action';
import { computeReadiness } from './readiness';
import { buildVaultItem, buildReady } from './vault-item.test-helpers';
import { threadMessageId, vaultItemId, wellKnownActorId } from '../ids';
import type { ThreadMessage } from '../thread/thread-message';

function question(): ThreadMessage {
  return {
    id:              threadMessageId('q-1'),
    vault_item_id:   vaultItemId('00000000-0000-0000-0000-000000000001'),
    author_actor_id: wellKnownActorId('boris'),
    kind:            'question',
    body:            'why?',
    in_reply_to:     null,
    answered_by:     null,
    created_at:      '2026-04-25T00:00:00Z',
  };
}

describe('computeNextAction', () => {
  it('archived → "Archived"', () => {
    const item = buildVaultItem({ archived_at: '2026-04-25T00:00:00Z' });
    const r = computeReadiness(item);
    const a = computeNextAction(item, r);
    expect(a.tone).toBe('archived');
    expect(a.prefix).toBe('Archived');
  });

  it('completed → "Done"', () => {
    const item = buildVaultItem({ completed_at: '2026-04-25T00:00:00Z' });
    const r = computeReadiness(item);
    const a = computeNextAction(item, r);
    expect(a.tone).toBe('done');
    expect(a.prefix).toBe('Done');
  });

  it('ready + assigned → "Ready to dispatch → @owner"', () => {
    const item = buildReady({ assigned_to: wellKnownActorId('boris') });
    const r = computeReadiness(item);
    const a = computeNextAction(item, r);
    expect(a.tone).toBe('ready');
    expect(a.prefix).toBe('Ready to dispatch');
    expect(a.value).toBe('→ @boris');
  });

  describe('grooming_status → next required move', () => {
    it('ungroomed → "intake review"', () => {
      const item = buildVaultItem({ acceptance_criteria: [], grooming_status: 'ungroomed', manual_priority: null, ai_priority: null });
      const a = computeNextAction(item, computeReadiness(item));
      expect(a.tone).toBe('waiting');
      expect(a.value).toBe('intake review');
    });

    it('intake_complete → "classification"', () => {
      const item = buildVaultItem({ acceptance_criteria: [], grooming_status: 'intake_complete', manual_priority: null, ai_priority: null });
      expect(computeNextAction(item, computeReadiness(item)).value).toBe('classification');
    });

    it('classified → "decomposition"', () => {
      const item = buildVaultItem({ acceptance_criteria: [], grooming_status: 'classified', manual_priority: null, ai_priority: null });
      expect(computeNextAction(item, computeReadiness(item)).value).toBe('decomposition');
    });

    // The reason #2 of the original concern: an item showing on the execution
    // board (because decomposition is done) reading "your approval" matches the
    // operator's mental model of what's actually blocked.
    it('decomposed → "your approval"', () => {
      const item = buildReady({ grooming_status: 'decomposed' });
      expect(computeNextAction(item, computeReadiness(item)).value).toBe('your approval');
    });

    it('needs_rework → "rework"', () => {
      const item = buildVaultItem({ grooming_status: 'needs_rework' });
      expect(computeNextAction(item, computeReadiness(item)).value).toBe('rework');
    });

    it('intake_rejected → "questions to be answered"', () => {
      const item = buildVaultItem({ grooming_status: 'intake_rejected' });
      expect(computeNextAction(item, computeReadiness(item)).value).toBe('questions to be answered');
    });
  });

  it('open questions beat grooming in priority order', () => {
    const item = buildVaultItem({ grooming_status: 'classified' });
    const r = computeReadiness(item, [question()]);
    const a = computeNextAction(item, r);
    expect(a.value).toMatch(/question/);
  });

  it('blockers beat everything', () => {
    const item = buildVaultItem({ grooming_status: 'classified' });
    const r = computeReadiness(item, [question()], [{ blocker_id: 'b', blocker_seq: 1820, blocker_title: 'x' }]);
    const a = computeNextAction(item, r);
    expect(a.value).toBe('blockers');
  });

  it('only AC missing → "Waiting on acceptance criteria"', () => {
    const item = buildReady({ acceptance_criteria: [] });
    const r = computeReadiness(item);
    const a = computeNextAction(item, r);
    expect(a.value).toBe('acceptance criteria');
  });

  it('only owner missing → "Waiting on owner assignment"', () => {
    const item = buildReady({ assigned_to: null });
    const r = computeReadiness(item);
    const a = computeNextAction(item, r);
    expect(a.value).toBe('owner assignment');
  });
});
