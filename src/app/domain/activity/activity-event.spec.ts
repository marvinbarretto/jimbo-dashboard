import { describe, it, expect } from 'vitest';
import { isVaultEvent, isProjectEvent, type VaultActivityEvent, type RejectionEvent } from './activity-event';
import { activityId, actorId, vaultItemId, threadMessageId } from '../ids';

describe('RejectionEvent', () => {
  it('is recognised as a vault event by isVaultEvent', () => {
    const event: RejectionEvent = {
      id: activityId('a-1'),
      actor_id: actorId('marvin'),
      at: '2026-04-27T10:00:00Z',
      vault_item_id: vaultItemId('v-1'),
      type: 'rejected',
      from_status: 'decomposed',
      to_status: 'needs_rework',
      from_owner: actorId('boris'),
      to_owner: actorId('vault-decompose'),
      reason: 'AC too verbose, retry',
      thread_message_id: threadMessageId('tm-1'),
    };
    expect(isVaultEvent(event)).toBe(true);
    expect(isProjectEvent(event)).toBe(false);
  });

  it('discriminates on `type === "rejected"`', () => {
    const event: VaultActivityEvent = {
      id: activityId('a-2'),
      actor_id: actorId('marvin'),
      at: '2026-04-27T10:00:00Z',
      vault_item_id: vaultItemId('v-1'),
      type: 'rejected',
      from_status: 'classified',
      to_status: 'needs_rework',
      from_owner: null,
      to_owner: actorId('marvin'),
      reason: 'rationale missing',
      thread_message_id: threadMessageId('tm-2'),
    };
    if (event.type === 'rejected') {
      expect(event.from_status).toBe('classified');
    } else {
      throw new Error('discrimination failed');
    }
  });
});
