import { describe, expect, it } from 'vitest';
import { parseStructuredProse } from './prose.utils';

describe('parseStructuredProse', () => {
  it('splits an inline enumerated list into intro + items', () => {
    const result = parseStructuredProse(
      'Update: (1) Headline, (2) About, (3) Skills. Do it, then get back to shipping.',
    );
    expect(result).toEqual({
      intro: 'Update:',
      items: ['Headline', 'About', 'Skills. Do it, then get back to shipping.'],
    });
  });

  it('does not treat a single numbered marker as a list', () => {
    expect(parseStructuredProse('See note (1) for details.')).toBeNull();
  });

  it('does not match ordinary parenthetical asides', () => {
    expect(parseStructuredProse('Ship it (most impressive work is invisible).')).toBeNull();
  });

  it('returns null for plain prose with no markers', () => {
    expect(parseStructuredProse('Community platform. Close to shipping but haphazard.')).toBeNull();
  });

  it('trims trailing commas left by the split', () => {
    const result = parseStructuredProse('Plan: (1) first, (2) second, (3) third');
    expect(result?.items).toEqual(['first', 'second', 'third']);
  });
});
