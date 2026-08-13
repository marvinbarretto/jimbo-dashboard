import { describe, expect, it } from 'vitest';
import type { DayCheckEntry, DayCheckItem, DayCheckResponseType } from '@domain/day-checks';
import { summariseChecks } from './day-checks-progress';

const entry = (over: Partial<DayCheckEntry> = {}): DayCheckEntry => ({
  id: 'e1',
  def_id: 'd1',
  day: '2026-08-13',
  value_bool: true,
  value_int: null,
  value_text: null,
  source: 'dashboard',
  noted_at: '2026-08-13T20:00:00Z',
  ...over,
});

const check = (
  response_type: DayCheckResponseType,
  answer: DayCheckEntry | null = null,
): DayCheckItem => ({
  id: `d-${response_type}-${answer ? 'a' : 'u'}`,
  label: 'Started the day with the Start Sequence',
  prompt: null,
  response_type,
  scale_min: null,
  scale_max: null,
  cadence: 'daily',
  active: true,
  sort_order: 0,
  watchdog_ref: null,
  notes: null,
  created_at: '2026-07-01T00:00:00Z',
  archived_at: null,
  entry: answer,
});

describe('summariseChecks — what counts as answered', () => {
  it('counts an item as answered whenever it carries an entry', () => {
    const progress = summariseChecks([check('bool', entry()), check('bool'), check('bool')]);
    expect(progress).toMatchObject({ answered: 1, total: 3, remaining: 2 });
  });

  // The journal page's rule, hoisted: a miss is a missing row, never a false.
  it('treats a "no" as answered — value falsiness is not the test', () => {
    const progress = summariseChecks([check('bool', entry({ value_bool: false }))]);
    expect(progress).toMatchObject({ answered: 1, remaining: 0 });
  });

  it('treats a zero on a scale as answered', () => {
    const progress = summariseChecks([
      check('scale', entry({ value_bool: null, value_int: 0 })),
    ]);
    expect(progress).toMatchObject({ answered: 1, remaining: 0 });
  });

  it('treats an entry with no value at all as answered', () => {
    const progress = summariseChecks([check('bool', entry({ value_bool: null }))]);
    expect(progress).toMatchObject({ answered: 1, remaining: 0 });
  });
});

describe('summariseChecks — the cost estimate', () => {
  it('prices a handful of ticks in seconds, so finishing reads as an offer', () => {
    expect(summariseChecks([check('bool'), check('bool')]).costLabel).toBe('~10s left');
  });

  it('prices typing higher than ticking', () => {
    expect(summariseChecks([check('text')]).costLabel).toBe('~30s left');
    expect(summariseChecks([check('scale')]).costLabel).toBe('~10s left');
  });

  it('rolls up to minutes once the list stops being a quick job', () => {
    const long = Array.from({ length: 5 }, () => check('text'));
    expect(summariseChecks(long).costLabel).toBe('~3m left');
  });

  it('charges nothing for checks already answered', () => {
    expect(summariseChecks([check('text', entry()), check('bool')]).costLabel).toBe('~5s left');
  });

  it('says nothing when the list is done', () => {
    expect(summariseChecks([check('bool', entry())]).costLabel).toBe('');
  });
});

describe('summariseChecks — nothing configured', () => {
  it('is empty rather than complete when there are no checks', () => {
    expect(summariseChecks([])).toEqual({ answered: 0, total: 0, remaining: 0, costLabel: '' });
  });
});
