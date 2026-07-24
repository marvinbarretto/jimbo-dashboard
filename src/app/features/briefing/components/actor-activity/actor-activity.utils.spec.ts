import { describe, it, expect } from 'vitest';
import { nextDay, fmtDuration, prettySkill, shortRepo, titleCase, timeRange } from './actor-activity.utils';

describe('nextDay', () => {
  it('advances one UTC day, including month/year rollover', () => {
    expect(nextDay('2026-07-24')).toBe('2026-07-25');
    expect(nextDay('2026-07-31')).toBe('2026-08-01');
    expect(nextDay('2026-12-31')).toBe('2027-01-01');
  });
});

describe('fmtDuration', () => {
  it('renders sub-hour durations in minutes', () => {
    expect(fmtDuration(0)).toBe('0min');
    expect(fmtDuration(43)).toBe('43min');
    expect(fmtDuration(59.4)).toBe('59min');
  });

  it('renders whole and part hours', () => {
    expect(fmtDuration(60)).toBe('1h');
    expect(fmtDuration(125)).toBe('2h 5min');
    expect(fmtDuration(355)).toBe('5h 55min');
  });
});

describe('prettySkill', () => {
  it('takes the last path segment and humanises hyphens', () => {
    expect(prettySkill('triage/email-triage')).toBe('email triage');
    expect(prettySkill('think/assertion-scan')).toBe('assertion scan');
    expect(prettySkill('briefing/daily-v2')).toBe('daily v2');
  });

  it('falls back to "work" when the skill is null', () => {
    expect(prettySkill(null)).toBe('work');
  });
});

describe('shortRepo', () => {
  it('drops the owner prefix, passes null through', () => {
    expect(shortRepo('marvinbarretto/jimbo-dashboard')).toBe('jimbo-dashboard');
    expect(shortRepo('bare')).toBe('bare');
    expect(shortRepo(null)).toBeNull();
  });
});

describe('titleCase', () => {
  it('capitalises the first letter only', () => {
    expect(titleCase('boris')).toBe('Boris');
    expect(titleCase('kipper')).toBe('Kipper');
  });
});

describe('timeRange', () => {
  it('returns null without a first timestamp', () => {
    expect(timeRange(null, '2026-07-24T10:00:00Z')).toBeNull();
  });

  it('collapses to a single time when first and last coincide', () => {
    const one = '2026-07-24T10:00:00.000Z';
    expect(timeRange(one, one)).not.toContain('–');
  });

  it('shows a range when first and last differ', () => {
    const range = timeRange('2026-07-24T05:00:00.000Z', '2026-07-24T19:00:00.000Z');
    expect(range).toContain('–');
  });
});
