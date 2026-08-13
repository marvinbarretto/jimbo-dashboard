import { describe, expect, it } from 'vitest';
import type { BriefingAnalysisData } from '@features/briefings/data-access/briefing.types';
import { buildDayShape } from './day-shape';

const analysis = (over: Partial<BriefingAnalysisData> = {}): BriefingAnalysisData => ({
  day_plan: [],
  email_highlights: [],
  surprise: null,
  vault_tasks: [],
  ...over,
});

describe('buildDayShape — v3 suggested blocks', () => {
  // This branch cannot be exercised against production: no briefing writes
  // suggested_blocks yet. Stubbed here on purpose rather than waited on.
  it('leads with the concrete start, rendered in London time', () => {
    const shape = buildDayShape(
      analysis({
        suggested_blocks: [
          {
            title: 'Ship the NOW card',
            size_blocks: 2,
            constraint: 'daytime',
            start: '2026-08-13T08:30:00Z',
            project: 'jimbo',
          },
        ],
      }),
    );
    // 08:30 UTC is 09:30 BST — the device zone must not get a say.
    expect(shape).toEqual([{ lead: '09:30', title: 'Ship the NOW card', meta: 'jimbo · 2 blocks' }]);
  });

  it('falls back to the fuzzy hint when no start was placed', () => {
    const shape = buildDayShape(
      analysis({
        suggested_blocks: [
          { title: 'Groom the vault', size_blocks: 1, constraint: 'anytime', start_hint: 'after lunch' },
        ],
      }),
    );
    expect(shape[0].lead).toBe('after lunch');
  });

  it('leads with the constraint when the block is unplaced entirely', () => {
    const shape = buildDayShape(
      analysis({
        suggested_blocks: [{ title: 'Groom the vault', size_blocks: 1, constraint: 'anytime' }],
      }),
    );
    expect(shape[0].lead).toBe('anytime');
  });

  it('stays quiet about a single block, which is the default size', () => {
    const shape = buildDayShape(
      analysis({
        suggested_blocks: [{ title: 'Groom the vault', size_blocks: 1, constraint: 'anytime' }],
      }),
    );
    expect(shape[0].meta).toBeNull();
  });

  it('falls back to the bucket when a block names no project', () => {
    const shape = buildDayShape(
      analysis({
        suggested_blocks: [
          { title: 'Groom the vault', size_blocks: 1, constraint: 'anytime', bucket: 'admin' },
        ],
      }),
    );
    expect(shape[0].meta).toBe('admin');
  });
});

describe('buildDayShape — v2 priorities', () => {
  it('is used when the briefing has no blocks', () => {
    const shape = buildDayShape(
      analysis({
        priorities: [
          { title: 'Standup', reasoning: '', constraint: 'fixed', fixed_time: '09:30' },
          { title: 'Invoice', reasoning: '', constraint: 'anytime', deadline: 'Fri', bucket: 'admin' },
          { title: 'Read', reasoning: '', constraint: 'anytime' },
        ],
      }),
    );
    expect(shape).toEqual([
      { lead: '09:30', title: 'Standup', meta: null },
      { lead: 'by Fri', title: 'Invoice', meta: 'admin' },
      { lead: 'anytime', title: 'Read', meta: null },
    ]);
  });

  it('loses to blocks when a v3 briefing carries both', () => {
    const shape = buildDayShape(
      analysis({
        suggested_blocks: [{ title: 'From blocks', size_blocks: 1, constraint: 'anytime' }],
        priorities: [{ title: 'From priorities', reasoning: '', constraint: 'anytime' }],
      }),
    );
    expect(shape).toHaveLength(1);
    expect(shape[0].title).toBe('From blocks');
  });
});

describe('buildDayShape — v1 day plan', () => {
  it('is the last resort', () => {
    const shape = buildDayShape(
      analysis({
        day_plan: [{ time: '10:00', suggestion: 'Deep work', source: 'calendar', reasoning: '' }],
      }),
    );
    expect(shape).toEqual([{ lead: '10:00', title: 'Deep work', meta: null }]);
  });

  it('survives a v2 row that nulls day_plan out rather than emptying it', () => {
    // The type says day_plan is always an array; the API disagrees on v2 rows.
    const nulled = { ...analysis(), day_plan: null } as unknown as BriefingAnalysisData;
    expect(buildDayShape(nulled)).toEqual([]);
  });
});

describe('buildDayShape — nothing to show', () => {
  it('returns an empty shape when there is no briefing at all', () => {
    // The pre-dawn case: /latest 404s and the card must not render.
    expect(buildDayShape(null)).toEqual([]);
    expect(buildDayShape(undefined)).toEqual([]);
  });

  it('returns an empty shape when every section is empty', () => {
    expect(buildDayShape(analysis({ suggested_blocks: [], priorities: [] }))).toEqual([]);
  });
});
