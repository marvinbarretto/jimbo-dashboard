import { describe, it, expect } from 'vitest';
import { nextDay, fmtDuration, prettySkill, shortRepo, titleCase, timeRange, buildLanes } from './actor-activity.utils';
import type { FleetReportActor } from '@domain/dispatch';
import type { CodeSession } from '../../../journal/data-access/code-sessions.service';

// Minimal builders — only the fields buildLanes reads; the rest is noise.
function agent(over: Partial<FleetReportActor> & { executor: string }): FleetReportActor {
  return {
    executor: over.executor,
    total_jobs: over.total_jobs ?? 0,
    completed: over.completed ?? over.total_jobs ?? 0,
    failed: over.failed ?? 0,
    estimated_cost: over.estimated_cost ?? 0,
    input_tokens: 0,
    output_tokens: 0,
    models_used: [],
    by_skill: over.by_skill ?? [],
    failures: [],
  };
}

function session(over: Partial<CodeSession>): CodeSession {
  return { actor: null, repo: null, duration_minutes: null, headline: null, friction: null, ...over } as CodeSession;
}

const idLabel = (slug: string) => slug;

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

describe('buildLanes', () => {
  it('leads with Marvin, then agents busiest-first', () => {
    const lanes = buildLanes(
      [agent({ executor: 'kipper', total_jobs: 2 }), agent({ executor: 'boris', total_jobs: 12 })],
      [session({ headline: 'shipped X' })],
      idLabel,
    );
    expect(lanes.map(l => l.id)).toEqual(['marvin', 'boris', 'kipper']);
  });

  it('omits the Marvin lane when there are no interactive sessions', () => {
    const lanes = buildLanes([agent({ executor: 'boris', total_jobs: 3 })], [], idLabel);
    expect(lanes.map(l => l.id)).toEqual(['boris']);
  });

  it('drops agents that ran no jobs', () => {
    const lanes = buildLanes(
      [agent({ executor: 'boris', total_jobs: 3 }), agent({ executor: 'kipper', total_jobs: 0 })],
      [], idLabel,
    );
    expect(lanes.map(l => l.id)).toEqual(['boris']);
  });

  it('summarises Marvin as sessions · duration · repos', () => {
    const lanes = buildLanes([], [
      session({ headline: 'a', duration_minutes: 43, repo: 'x/dash' }),
      session({ headline: 'b', duration_minutes: 117, repo: 'x/api' }),
    ], idLabel);
    expect(lanes[0]!.summary).toBe('2 sessions · 2h 40min · 2 repos');
  });

  it('surfaces failures and cost in the agent summary', () => {
    const lanes = buildLanes(
      [agent({ executor: 'boris', total_jobs: 5, completed: 4, failed: 1, estimated_cost: 2.977 })],
      [], idLabel,
    );
    expect(lanes[0]!.summary).toBe('4/5 done · 1 failed · $2.98');
  });

  it('flags sustained-loop skills and high-friction sessions', () => {
    const [marvin, boris] = buildLanes(
      [agent({ executor: 'boris', total_jobs: 1, by_skill: [
        { skill: 'triage/email-triage', flow: 'commission', count: 6, first_at: null, last_at: null, sustained_loop: true },
      ] })],
      [session({ headline: 'grind', friction: { level: 'high', turns: 40, corrections: 3 } })],
      idLabel,
    );
    expect(marvin!.items[0]!.flagged).toBe(true);
    expect(boris!.items[0]!.flagged).toBe(true);
    expect(boris!.items[0]!.label).toBe('email triage ×6');
  });

  it('routes slugs through the label resolver', () => {
    const lanes = buildLanes([agent({ executor: 'boris', total_jobs: 1 })], [], slug => `Actor:${slug}`);
    expect(lanes[0]!.label).toBe('Actor:boris');
  });
});
