import { linksSkippedByPolicy, toJourney } from './email-journey';

describe('toJourney', () => {
  it('reads the deep shape kipper writes', () => {
    const j = toJourney({
      body: {
        summary: 'A gig announcement.',
        content_type: 'newsletter',
        entities: ['Roundhouse', 'Camden'],
        events: [{ what: 'Gig', when: 'Friday', where: 'Roundhouse', cost: null }],
        deadlines: [{ what: 'Book', by: 'Thursday' }],
        key_asks: ['Buy tickets'],
      },
      links: [
        {
          url: 'https://example.com',
          page_title: 'Tickets',
          page_summary: 'Ticket page',
          fetch_status: 'ok',
          screenshot_url: 'https://r2.example/shot.png',
          entities: [],
          events: [],
        },
      ],
    });
    expect(j.shape).toBe('deep');
    expect(j.entities).toEqual(['Roundhouse', 'Camden']);
    expect(j.events[0].what).toBe('Gig');
    expect(j.links[0].screenshotUrl).toBe('https://r2.example/shot.png');
    expect(j.linksRecorded).toBe(true);
  });

  it('reads the triage shape (score/summary only, no links key)', () => {
    const j = toJourney({
      body: { score: 5, summary: 'Utility notice.', content_type: 'notification' },
    });
    expect(j.shape).toBe('triage');
    expect(j.score).toBe(5);
    expect(j.linksRecorded).toBe(false);
    expect(j.entities).toEqual([]);
  });

  it('treats a missing or malformed payload as no analysis', () => {
    expect(toJourney(null).shape).toBe('none');
    expect(toJourney(undefined).shape).toBe('none');
    expect(toJourney('not an object').shape).toBe('none');
    expect(toJourney({ body: 'still not an object' }).shape).toBe('none');
  });

  it('deep when structured keys are present even if empty', () => {
    // A newsletter with nothing extracted is still a deep read, not triage.
    const j = toJourney({
      body: { summary: 'x', content_type: 'newsletter', entities: [], events: [] },
    });
    expect(j.shape).toBe('deep');
  });

  it('surfaces unknown body keys instead of dropping them', () => {
    const j = toJourney({
      body: { summary: 'x', content_type: 'unknown', sentiment: 'spicy' },
    });
    expect(j.extraKeys).toEqual(['sentiment']);
  });

  it('drops empty/malformed events but keeps partial ones', () => {
    const j = toJourney({
      body: {
        events: [{ what: null, when: null, where: null }, { what: 'Show' }, 'junk'],
      },
    });
    expect(j.events).toEqual([{ what: 'Show', when: null, where: null, cost: null }]);
  });
});

describe('linksSkippedByPolicy', () => {
  it('true for noise content types with no links', () => {
    const j = toJourney({ body: { summary: 'x', content_type: 'notification' } });
    expect(linksSkippedByPolicy(j)).toBe(true);
  });

  it('false when links were followed or type is not noise', () => {
    const newsletter = toJourney({ body: { summary: 'x', content_type: 'newsletter' } });
    expect(linksSkippedByPolicy(newsletter)).toBe(false);
    expect(linksSkippedByPolicy(toJourney(null))).toBe(false);
  });
});
