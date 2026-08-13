import { describe, expect, it } from 'vitest';
import { buildGlance, type GlanceInput } from './glance';

const glance = (over: Partial<GlanceInput> = {}) =>
  buildGlance({ day: '2026-08-13', intakeKcal: 1840, ...over });

describe('buildGlance — the date', () => {
  it('renders the logical day as a short weekday label', () => {
    expect(glance().dateLabel).toBe('Thu 13 Aug');
  });

  it('does not slip a day across the DST boundary', () => {
    expect(buildGlance({ day: '2026-03-29', intakeKcal: null }).dateLabel).toBe('Sun 29 Mar');
    expect(buildGlance({ day: '2026-10-25', intakeKcal: null }).dateLabel).toBe('Sun 25 Oct');
  });
});

describe('buildGlance — the stats', () => {
  it('groups thousands so the numbers stay readable at a glance', () => {
    expect(glance({ steps: 11204 }).statsLabel).toBe('1,840 kcal · 11,204 steps');
  });

  it('says nothing about steps when no source is wired', () => {
    expect(glance().statsLabel).toBe('1,840 kcal');
  });

  it('owns up when a wired source reports nothing, rather than claiming zero', () => {
    // A missing sync is not a sedentary day.
    expect(glance({ steps: null }).statsLabel).toBe('1,840 kcal · — steps');
  });

  it('still reports a genuine zero from the server', () => {
    expect(glance({ steps: 0 }).statsLabel).toBe('1,840 kcal · 0 steps');
  });

  it('takes the higher of server and device steps, since steps only go up', () => {
    expect(glance({ steps: 4120, deviceSteps: 6510 }).statsLabel).toContain('6,510 steps');
    expect(glance({ steps: 9000, deviceSteps: 6510 }).statsLabel).toContain('9,000 steps');
  });

  it('falls back to the device when the server has nothing', () => {
    expect(glance({ steps: null, deviceSteps: 2400 }).statsLabel).toContain('2,400 steps');
  });

  it('admits an empty day instead of rendering a bare separator', () => {
    expect(buildGlance({ day: '2026-08-13', intakeKcal: null }).statsLabel).toBe('nothing logged yet');
  });
});

describe('buildGlance — what is next', () => {
  it('counts down in minutes under the hour', () => {
    expect(glance({ upcoming: [{ title: 'standup', in_minutes: 25 }] }).nextLabel).toBe(
      'standup in 25m',
    );
  });

  it('switches to hours once the minute count stops being useful', () => {
    expect(glance({ upcoming: [{ title: 'standup', in_minutes: 145 }] }).nextLabel).toBe(
      'standup in 2h',
    );
  });

  it('says a thing is starting now rather than counting negatives', () => {
    expect(glance({ upcoming: [{ title: 'standup', in_minutes: 0 }] }).nextLabel).toBe(
      'standup now',
    );
    expect(glance({ upcoming: [{ title: 'standup', in_minutes: -5 }] }).nextLabel).toBe(
      'standup now',
    );
  });

  it('drops the countdown for all-day events, which have no meaningful start', () => {
    expect(glance({ upcoming: [{ title: 'CHAMPIONSHIP', in_minutes: null }] }).nextLabel).toBe(
      'CHAMPIONSHIP',
    );
  });

  it('truncates a title long enough to wrap the strip', () => {
    const label = glance({
      upcoming: [{ title: 'Quarterly planning and roadmap review', in_minutes: 30 }],
    }).nextLabel;
    expect(label).toBe('Quarterly planning and road… in 30m');
  });

  it('is honest about an empty calendar', () => {
    expect(glance({ upcoming: [] }).nextLabel).toBe('nothing next');
  });
});

describe('buildGlance — the screen-reader summary', () => {
  it('expands the shorthand into something speakable', () => {
    const { srSummary } = glance({ steps: 11204, upcoming: [{ title: 'standup', in_minutes: 25 }] });
    expect(srSummary).toBe(
      'Thursday 13 August. 1,840 calories logged, 11,204 steps. Next: standup in 25 minutes.',
    );
  });

  it('does not read out a silent step counter as a number', () => {
    expect(glance({ steps: null }).srSummary).toContain('step count unavailable');
  });

  it('says the day is empty in words', () => {
    expect(buildGlance({ day: '2026-08-13', intakeKcal: null }).srSummary).toContain(
      'Nothing logged yet.',
    );
  });
});
