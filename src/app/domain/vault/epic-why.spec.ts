import { describe, it, expect } from 'vitest';
import { epicWhy } from './epic-why';

describe('epicWhy', () => {
  it('is null when the epic never says why', () => {
    expect(epicWhy(null)).toBeNull();
    // Epic #2815 in full, on 2026-08-28 — a what, not a why.
    expect(epicWhy('Fetch director and top cast from TMDb credits. Add decade filter chips to UI.')).toBeNull();
  });

  it('reads the block and stops at the next heading', () => {
    const why = epicWhy('intro\n\n## Why\nWho it\'s for: Marvin.\nHow we would know: chips get used.\n\n## Acceptance criteria\n- nope')!;
    expect(why).toContain('Marvin');
    expect(why).toContain('chips get used');
    expect(why).not.toContain('nope');
  });

  it('runs to the end when Why is last', () => {
    expect(epicWhy('# E\n\n### why\nBecause the digest does the hunt.')).toBe('Because the digest does the hunt.');
  });

  it('treats an empty heading as absent — a stub is not an answer', () => {
    expect(epicWhy('## Why\n\n## Acceptance criteria\n- a')).toBeNull();
  });

  it('does not match a word merely starting with why', () => {
    expect(epicWhy('## Whyteboard notes\nsomething')).toBeNull();
  });
});
