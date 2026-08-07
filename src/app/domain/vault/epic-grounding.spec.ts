import { describe, expect, it } from 'vitest';
import { criterionExpected, isEpicGrounded } from './epic-grounding';

const product = { success_criteria: '- Live at localshout.com\n- Native shells published' };
const enabling = { success_criteria: null };

describe('criterionExpected', () => {
  it('is true only when the project actually states criteria', () => {
    expect(criterionExpected(product)).toBe(true);
    expect(criterionExpected(enabling)).toBe(false);
    expect(criterionExpected({ success_criteria: '   \n ' })).toBe(false);
    expect(criterionExpected(null)).toBe(false);
    expect(criterionExpected(undefined)).toBe(false);
  });
});

describe('isEpicGrounded', () => {
  it('requires both halves on a project that states criteria', () => {
    expect(isEpicGrounded({ serves_persona: 'Locals', moves_criterion: 'Live at …' }, product)).toBe(true);
    expect(isEpicGrounded({ serves_persona: 'Locals', moves_criterion: null }, product)).toBe(false);
  });

  // The whole point of the change: jimbo's 22 epics were permanently ungrounded
  // for a reason that wasn't a defect.
  it('needs only a persona on a project that states no criteria', () => {
    expect(isEpicGrounded({ serves_persona: 'Boris (grooming agent)', moves_criterion: null }, enabling))
      .toBe(true);
  });

  it('always requires the persona', () => {
    expect(isEpicGrounded({ serves_persona: null, moves_criterion: 'Live at …' }, product)).toBe(false);
    expect(isEpicGrounded({ serves_persona: null, moves_criterion: null }, enabling)).toBe(false);
  });

  it('treats whitespace-only values as unset', () => {
    expect(isEpicGrounded({ serves_persona: '  ', moves_criterion: null }, enabling)).toBe(false);
    expect(isEpicGrounded({ serves_persona: 'Locals', moves_criterion: ' ' }, product)).toBe(false);
  });

  // An unfiled epic has no criteria to cite, so it must not be held to them.
  it('falls back to persona-only when the epic has no project', () => {
    expect(isEpicGrounded({ serves_persona: 'Marvin', moves_criterion: null }, null)).toBe(true);
  });
});
