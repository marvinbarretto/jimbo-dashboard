import { describe, it, expect } from 'vitest';
import { groupCommissions, commissionStage, type CommissionStage } from './commission-view';
import type { DispatchQueueEntry, DispatchStatus, DispatchFlow, PrState } from './dispatch-queue-entry';
import { dispatchId, vaultItemId, actorId, skillId } from '../ids';

// Builder — only the fields each test cares about; sane defaults for the rest.
let n = 0;
function entry(over: Partial<DispatchQueueEntry> & { task: string; created: string }): DispatchQueueEntry {
  return {
    id: dispatchId(`d${n++}`),
    task_id: vaultItemId(over.task),
    skill: skillId('code/pr-from-issue'),
    status: over.status ?? 'completed',
    executor: over.executor ?? actorId('boris'),
    started_at: null,
    completed_at: null,
    retry_count: 0,
    skill_context: null,
    result_summary: null,
    error: null,
    created_at: over.created,
    flow: over.flow ?? 'commission',
    agent_type: 'coder',
    pr_state: over.pr_state ?? null,
    pr_url: over.pr_url ?? null,
    ...over,
  };
}

describe('commissionStage — status + pr_state → honest stage', () => {
  const cases: ReadonlyArray<[DispatchStatus, PrState | null, CommissionStage]> = [
    ['approved',    null,     'approved'],
    ['dispatching', null,     'approved'],
    ['running',     null,     'running'],
    ['failed',      null,     'failed'],
    ['completed',   'merged', 'merged'],
    ['completed',   'open',   'pr_open'],
    ['completed',   'draft',  'pr_open'],
    ['completed',   null,     'completed'],
    ['completed',   'closed', 'completed'],
  ];
  for (const [status, pr, expected] of cases) {
    it(`${status} + pr_state=${pr} → ${expected}`, () => {
      expect(commissionStage(entry({ task: 't', created: '2026-06-01T00:00:00Z', status, pr_state: pr }))).toBe(expected);
    });
  }
});

describe('groupCommissions', () => {
  it('excludes groom and recon flows entirely', () => {
    const items = groupCommissions([
      entry({ task: 'a', created: '2026-06-01T00:00:00Z', flow: 'groom' as DispatchFlow }),
      entry({ task: 'b', created: '2026-06-01T00:00:00Z', flow: 'recon' as DispatchFlow }),
      entry({ task: 'c', created: '2026-06-01T00:00:00Z', flow: 'commission' }),
    ]);
    expect(items).toHaveLength(1);
    expect(items[0].taskId).toBe(vaultItemId('c'));
  });

  it('collapses many dispatches for one item into a single entry', () => {
    const items = groupCommissions([
      entry({ task: 'x', created: '2026-06-01T00:00:00Z' }),
      entry({ task: 'x', created: '2026-06-02T00:00:00Z' }),
      entry({ task: 'x', created: '2026-06-03T00:00:00Z' }),
    ]);
    expect(items).toHaveLength(1);
    expect(items[0].history).toHaveLength(3);
  });

  it('uses the newest dispatch as latest + derives stage from it; history is newest-first', () => {
    const items = groupCommissions([
      entry({ task: 'x', created: '2026-06-01T00:00:00Z', status: 'failed' }),
      entry({ task: 'x', created: '2026-06-03T00:00:00Z', status: 'completed', pr_state: 'merged' }),
      entry({ task: 'x', created: '2026-06-02T00:00:00Z', status: 'running' }),
    ]);
    expect(items[0].stage).toBe('merged');
    expect(items[0].latest.created_at).toBe('2026-06-03T00:00:00Z');
    expect(items[0].history.map(h => h.created_at)).toEqual([
      '2026-06-03T00:00:00Z', '2026-06-02T00:00:00Z', '2026-06-01T00:00:00Z',
    ]);
  });

  it('returns most-recently-touched item first', () => {
    const items = groupCommissions([
      entry({ task: 'old', created: '2026-06-01T00:00:00Z' }),
      entry({ task: 'new', created: '2026-06-09T00:00:00Z' }),
    ]);
    expect(items.map(i => i.taskId)).toEqual([vaultItemId('new'), vaultItemId('old')]);
  });

  it('is empty when there are no commission dispatches', () => {
    expect(groupCommissions([
      entry({ task: 'a', created: '2026-06-01T00:00:00Z', flow: 'groom' as DispatchFlow }),
    ])).toEqual([]);
  });
});
