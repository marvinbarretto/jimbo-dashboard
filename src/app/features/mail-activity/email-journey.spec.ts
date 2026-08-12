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

// ── Skipped links: recorded fact vs inference ──────────────────────
//
// kipper started recording the links it declined to open on 2026-08-12.
// Before that, an email showing two traces was indistinguishable from one
// holding twenty links, and "we chose not to look" could only be deduced.

describe('links_skipped', () => {
  it('reads recorded skips with their reason', () => {
    const j = toJourney({
      body: { summary: 's', entities: ['x'] },
      links: [],
      links_skipped: [
        { url: 'https://a.example', reason: 'over-max-links', limit: 10 },
        { url: 'mailto:x@y.com', reason: 'not-followable' },
      ],
    });
    expect(j.linksSkippedRecorded).toBe(true);
    expect(j.linksSkipped.length).toBe(2);
    expect(j.linksSkipped[0].reason).toBe('over-max-links');
    expect(j.linksSkipped[0].limit).toBe(10);
    expect(j.linksSkipped[1].reason).toBe('not-followable');
  });

  // Absence of the key is not a claim of "none" — those are different facts
  // and the page must not render them the same.
  it('distinguishes "no skips recorded" from "recorded, and there were none"', () => {
    const older = toJourney({ body: { summary: 's', entities: [] }, links: [] });
    expect(older.linksSkippedRecorded).toBe(false);
    expect(older.linksSkipped).toEqual([]);

    const recorded = toJourney({ body: { summary: 's', entities: [] }, links: [], links_skipped: [] });
    expect(recorded.linksSkippedRecorded).toBe(true);
    expect(recorded.linksSkipped).toEqual([]);
  });

  // A reason this build doesn't know must survive to the page rather than be
  // dropped or relabelled as something we do recognise.
  it('surfaces an unknown reason verbatim instead of guessing', () => {
    const j = toJourney({
      body: { summary: 's' },
      links_skipped: [{ url: 'https://a.example', reason: 'robots-disallowed' }],
    });
    expect(j.linksSkipped[0].reason).toBeNull();
    expect(j.linksSkipped[0].rawReason).toBe('robots-disallowed');
  });

  it('prefers the recorded policy skip over inferring it from content_type', () => {
    // Recorded says the noise skip happened — trust it.
    const recorded = toJourney({
      body: { summary: 's', content_type: 'promotional' },
      links: [],
      links_skipped: [{ url: 'https://a.example', reason: 'noise-content-type', content_type: 'promotional' }],
    });
    expect(linksSkippedByPolicy(recorded)).toBe(true);

    // Recorded, but the skips were for other reasons — so the noise-policy
    // claim is false even though content_type would have implied it.
    const other = toJourney({
      body: { summary: 's', content_type: 'promotional', entities: [] },
      links: [],
      links_skipped: [{ url: 'https://a.example', reason: 'not-followable' }],
    });
    expect(linksSkippedByPolicy(other)).toBe(false);
  });

  it('still infers the policy skip on rows that predate skip recording', () => {
    const legacy = toJourney({
      body: { summary: 's', content_type: 'promotional', entities: [] },
      links: [],
    });
    expect(legacy.linksSkippedRecorded).toBe(false);
    expect(linksSkippedByPolicy(legacy)).toBe(true);
  });
});
