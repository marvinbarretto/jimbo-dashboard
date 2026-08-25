import { describe, it, expect } from 'vitest';
import { failureToNotification } from './failure-notification';
import type { FleetFailure } from './fleet-stats.api-schema';

function failure(over: Partial<FleetFailure> = {}): FleetFailure {
  return {
    id: '4608',
    task_id: 'briefing-morning',
    note_title: null,
    skill: 'briefing/daily-v2',
    flow: 'recon',
    executor: 'boris',
    error_message: 'API Error: 529 Overloaded',
    retry_count: 2,
    completed_at: '2026-08-24T06:40:57Z',
    dismissed_at: null,
    ...over,
  };
}

describe('failureToNotification', () => {
  it('labels a briefing failure by session, linked to the archive', () => {
    const n = failureToNotification(failure({ task_id: 'briefing-evening' }));
    expect(n.source).toBe('Briefing · evening');
    expect(n.href).toBe('/briefings');
  });

  it('labels a grooming failure generically, linked to the fleet board', () => {
    const n = failureToNotification(failure({
      task_id: 'note-123',
      flow: 'groom',
      skill: 'vault-grooming/decompose',
      note_title: 'Audit film entity schema',
      error_message: '500 from /api/grooming/submit/decomposition',
    }));
    expect(n.source).toBe('Grooming');
    expect(n.message).toBe('Audit film entity schema — 500 from /api/grooming/submit/decomposition');
    expect(n.href).toBe('/fleet');
  });

  it('falls back to the skill when flow is not groom/briefing', () => {
    const n = failureToNotification(failure({
      task_id: 'note-456',
      flow: 'fold',
      skill: 'docs-staleness/check',
    }));
    expect(n.source).toBe('docs-staleness/check');
  });

  it('falls back to a generic message when error_message is null', () => {
    const n = failureToNotification(failure({ error_message: null, note_title: null }));
    expect(n.message).toBe('Dispatch failed');
  });

  it('carries id and timestamp through unchanged', () => {
    const n = failureToNotification(failure());
    expect(n.id).toBe('4608');
    expect(n.timestamp).toBe('2026-08-24T06:40:57Z');
  });

  it('grades tone by proximity to the retry cap, not a flat danger', () => {
    expect(failureToNotification(failure({ retry_count: 0 })).tone).toBe('warning');
    expect(failureToNotification(failure({ retry_count: 1 })).tone).toBe('warning');
    expect(failureToNotification(failure({ retry_count: 2 })).tone).toBe('danger');
    expect(failureToNotification(failure({ retry_count: 5 })).tone).toBe('danger');
  });

  it('defaults count to 1, but carries a caller-supplied group size through', () => {
    expect(failureToNotification(failure()).count).toBe(1);
    expect(failureToNotification(failure(), 5).count).toBe(5);
  });
});
