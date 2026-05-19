import { describe, it, expect } from 'vitest';
import { OWNER_BY_GROOMING_STATE, ownerForGroomingState } from './grooming-ownership';
import { wellKnownActorId } from '../ids';

const boris  = wellKnownActorId('boris');
const ralph  = wellKnownActorId('ralph');
const marvin = wellKnownActorId('marvin');

describe('OWNER_BY_GROOMING_STATE', () => {
  it('maps every state — boris/ralph for skill states, marvin for approvals, null for ready', () => {
    expect(OWNER_BY_GROOMING_STATE).toEqual({
      ungroomed:        boris,
      intake_rejected:  marvin,
      intake_complete:  boris,
      classified:       ralph,
      decomposed:       marvin,
      needs_rework:     marvin,
      ready:            null,
    });
  });
});

describe('ownerForGroomingState', () => {
  it('returns canonical owner when current differs', () => {
    expect(ownerForGroomingState('decomposed', boris)).toBe(marvin);
    expect(ownerForGroomingState('classified', marvin)).toBe(ralph);
  });

  it('returns null when current owner already matches (no redundant reassignment)', () => {
    expect(ownerForGroomingState('decomposed', marvin)).toBeNull();
    expect(ownerForGroomingState('classified', ralph)).toBeNull();
  });

  it('returns null for `ready` regardless of current owner — dispatcher picks executor', () => {
    expect(ownerForGroomingState('ready', boris)).toBeNull();
    expect(ownerForGroomingState('ready', marvin)).toBeNull();
    expect(ownerForGroomingState('ready', null)).toBeNull();
  });

  it('returns canonical owner when current is null (unassigned item)', () => {
    expect(ownerForGroomingState('ungroomed', null)).toBe(boris);
    expect(ownerForGroomingState('decomposed', null)).toBe(marvin);
  });
});
