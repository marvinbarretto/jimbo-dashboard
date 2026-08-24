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

  it('carries id, timestamp, and a danger tone through unchanged', () => {
    const n = failureToNotification(failure());
    expect(n.id).toBe('4608');
    expect(n.timestamp).toBe('2026-08-24T06:40:57Z');
    expect(n.tone).toBe('danger');
  });
});
