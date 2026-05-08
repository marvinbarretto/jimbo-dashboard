import { describe, it, expect } from 'vitest';

import { GROOMING_STATUS_ORDER, type GroomingStatus } from './vault-item';
import { ALLOWED_TRANSITIONS, isAllowedTransition } from './transitions';

describe('ALLOWED_TRANSITIONS', () => {
  it('covers every GroomingStatus as a key', () => {
    // Compile-time `satisfies` already enforces this — the runtime check
    // catches accidental key removals during refactors.
    for (const status of GROOMING_STATUS_ORDER) {
      expect(ALLOWED_TRANSITIONS[status]).toBeDefined();
    }
  });

  it('only references valid GroomingStatus values in destinations', () => {
    const valid = new Set<string>(GROOMING_STATUS_ORDER);
    for (const [from, tos] of Object.entries(ALLOWED_TRANSITIONS)) {
      for (const to of tos) {
        expect(valid.has(to)).toBe(true);
        expect(to).not.toBe(from); // self-loops are no-ops, not table entries
      }
    }
  });

  it('always allows entry into needs_rework from any other status', () => {
    // The reject flow is the universal side-branch — every state must be able
    // to send an item to needs_rework. This is policy, not coincidence.
    for (const from of GROOMING_STATUS_ORDER) {
      if (from === 'needs_rework') continue;
      expect(ALLOWED_TRANSITIONS[from]).toContain('needs_rework');
    }
  });
});

describe('isAllowedTransition', () => {
  it('is true for self-transitions (no-op)', () => {
    expect(isAllowedTransition('ungroomed', 'ungroomed')).toBe(true);
    expect(isAllowedTransition('ready', 'ready')).toBe(true);
  });

  it('allows the canonical forward path', () => {
    expect(isAllowedTransition('ungroomed', 'intake_complete')).toBe(true);
    expect(isAllowedTransition('intake_complete', 'classified')).toBe(true);
    expect(isAllowedTransition('classified', 'decomposed')).toBe(true);
    expect(isAllowedTransition('decomposed', 'ready')).toBe(true);
  });

  it('allows backward operator escape hatches', () => {
    expect(isAllowedTransition('ready', 'decomposed')).toBe(true);
    expect(isAllowedTransition('classified', 'intake_complete')).toBe(true);
  });

  it('refuses skipping intermediate stages', () => {
    expect(isAllowedTransition('ungroomed', 'ready')).toBe(false);
    expect(isAllowedTransition('ungroomed', 'classified')).toBe(false);
    expect(isAllowedTransition('intake_complete', 'ready')).toBe(false);
  });

  it('refuses unknown destinations defensively', () => {
    expect(isAllowedTransition('ungroomed', 'archived' as unknown as GroomingStatus)).toBe(false);
  });
});
