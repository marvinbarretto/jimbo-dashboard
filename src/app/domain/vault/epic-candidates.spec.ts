import { describe, expect, it } from 'vitest';
import { rankEpicCandidates, scoreEpicCandidate, titleTokens } from './epic-candidates';
import { buildVaultItem } from './vault-item.test-helpers';

const epic = (over: Parameters<typeof buildVaultItem>[0]) =>
  buildVaultItem({ is_epic: true, ...over });

describe('titleTokens', () => {
  it('drops stop words, short words and punctuation', () => {
    expect([...titleTokens('Fix the feed — add a curation lens!')])
      .toEqual(['feed', 'curation', 'lens']);
  });

  it('splits hyphenated words so "feed-presentation" matches "feed"', () => {
    expect([...titleTokens('feed-presentation')]).toEqual(['feed', 'presentation']);
  });

  it('is case-insensitive', () => {
    expect([...titleTokens('CURATION')]).toEqual([...titleTokens('curation')]);
  });
});

describe('scoreEpicCandidate', () => {
  it('weighs a shared tag double a shared title word', () => {
    const item = { title: 'curation work', tags: ['feed'] };
    const byTag = scoreEpicCandidate(item, epic({ title: 'unrelated', tags: ['feed'], seq: 1 }));
    const byWord = scoreEpicCandidate(item, epic({ title: 'curation elsewhere', tags: [], seq: 2 }));

    expect(byTag.score).toBe(2);
    expect(byWord.score).toBe(1);
  });

  it('scores zero when nothing is shared', () => {
    const c = scoreEpicCandidate(
      { title: 'book flights from Ireland', tags: ['travel'] },
      epic({ title: 'grooming pipeline', tags: ['vault'], seq: 1 }),
    );
    expect(c.score).toBe(0);
    expect(c.reasons).toEqual([]);
  });

  // The score alone is unexplainable, and an operator won't trust a bare
  // number attached to someone else's epic.
  it('explains what drove the score', () => {
    const c = scoreEpicCandidate(
      { title: 'fix the discoverability feed', tags: ['localshout', 'ui'] },
      epic({ title: 'fix discoverability', tags: ['localshout'], seq: 3061 }),
    );
    expect(c.reasons[0]).toBe('shares #localshout');
    expect(c.reasons[1]).toContain('discoverability');
  });

  // Found by running the report against the live vault: #3613 and #3586 both
  // scored 4 largely on `session-2026-07-31` — contemporaneous, not related.
  it('ignores date-stamped provenance tags', () => {
    const c = scoreEpicCandidate(
      { title: 'book flights', tags: ['session-2026-07-31'] },
      epic({ title: 'grooming pipeline', tags: ['session-2026-07-31'], seq: 1 }),
    );
    expect(c.score).toBe(0);
    expect(c.reasons).toEqual([]);
  });

  it('still scores the topic tags on an item that also carries a session tag', () => {
    const c = scoreEpicCandidate(
      { title: 'x', tags: ['grooming', 'session-2026-07-31'] },
      epic({ title: 'y', tags: ['grooming', 'session-2026-07-31'], seq: 1 }),
    );
    expect(c.score).toBe(2);
    expect(c.reasons[0]).toBe('shares #grooming');
  });

  it('caps the words listed in a reason at three', () => {
    const c = scoreEpicCandidate(
      { title: 'alpha bravo charlie delta echo', tags: [] },
      epic({ title: 'alpha bravo charlie delta echo', tags: [], seq: 1 }),
    );
    expect(c.score).toBe(5);
    expect(c.reasons[0].split(',')).toHaveLength(3);
  });
});

describe('rankEpicCandidates', () => {
  const item = { title: 'collapse recurring events in the feed', tags: ['localshout', 'feed'] };

  it('orders by score, best first', () => {
    const out = rankEpicCandidates(item, [
      epic({ title: 'scrapers', tags: ['localshout'], seq: 3250 }),
      epic({ title: 'fix feed discoverability', tags: ['localshout', 'feed'], seq: 3061 }),
    ]);
    expect(out.map(c => c.epic.seq)).toEqual([3061, 3250]);
  });

  // An empty list is the honest answer — it's what tells the operator that
  // unparented is correct, rather than nudging them at the least-bad epic.
  it('returns nothing when no epic shares anything', () => {
    expect(rankEpicCandidates(
      { title: 'book flights from Ireland', tags: [] },
      [epic({ title: 'grooming pipeline', tags: ['vault'], seq: 1 })],
    )).toEqual([]);
  });

  it('breaks ties by seq so the order is stable across renders', () => {
    const out = rankEpicCandidates(item, [
      epic({ title: 'feed work', tags: [], seq: 900 }),
      epic({ title: 'feed work', tags: [], seq: 100 }),
    ]);
    expect(out.map(c => c.epic.seq)).toEqual([100, 900]);
  });

  it('respects the limit', () => {
    const epics = [1, 2, 3, 4, 5].map(seq => epic({ title: 'feed thing', tags: ['feed'], seq }));
    expect(rankEpicCandidates(item, epics, 2)).toHaveLength(2);
  });

  it('handles an item with no tags and an epic with none', () => {
    expect(() => rankEpicCandidates({ title: 'x', tags: [] }, [epic({ title: 'y', tags: [], seq: 1 })]))
      .not.toThrow();
  });
});
