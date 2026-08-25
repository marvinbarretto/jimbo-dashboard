import { describe, expect, it } from 'vitest';
import type { FleetQueueDepth, FleetRunning, FleetWorker } from '@domain/dispatch';
import type { Signal as DayStreamSignal } from '@domain/day-stream/day-stream';
import { backlogByExecutor, formatAge, healthAlerts, healthHeadline, workerRows } from './fleet-health';

// Fixed clock throughout — a health panel that behaves differently depending on
// when the suite runs is the last thing that should be flaky.
const NOW = new Date('2026-08-25T23:37:00Z');
const agoMin = (m: number) => new Date(NOW.getTime() - m * 60_000).toISOString();

const worker = (p: Partial<FleetWorker> & { id: string }): FleetWorker => ({
  machine: 'm2', status: 'polling', checked_at: agoMin(1), next_poll_at: null, ...p,
});

const depth = (executor: string, status: string, count: number): FleetQueueDepth =>
  ({ executor, status, count });

const running = (p: Partial<FleetRunning> & { id: string }): FleetRunning => ({
  task_id: 'note_x', note_title: 'A note', skill: 'groom/x', flow: 'groom',
  executor: 'boris', started_at: agoMin(10), ...p,
});

const signal = (p: Partial<DayStreamSignal> & { id: string; status: DayStreamSignal['status'] }): DayStreamSignal => ({
  label: p.id, category: 'body', mode: 'aggregate', count: 0,
  last_seen: null, stale_days: null, note: null, ...p,
});

describe('workerRows', () => {
  it('is calm while a worker is checking in', () => {
    expect(workerRows([worker({ id: 'kipper', checked_at: agoMin(1) })], NOW)[0].tone).toBe('ok');
  });

  it('escalates as a worker goes quiet', () => {
    expect(workerRows([worker({ id: 'a', checked_at: agoMin(20) })], NOW)[0].tone).toBe('warn');
    expect(workerRows([worker({ id: 'b', checked_at: agoMin(90) })], NOW)[0].tone).toBe('alert');
  });

  // A throttled worker is deliberately quiet. Alarming on it would cry wolf
  // every time the fleet backs off for quota, and the panel would be ignored.
  it('never alarms on a cooling-down worker', () => {
    const cooling = worker({ id: 'boris', status: 'cooldown', checked_at: agoMin(240) });
    const row = workerRows([cooling], NOW)[0];
    expect(row.tone).toBe('ok');
    expect(row.expectation).toBe('cooling down');
  });

  it('says so when a worker has never checked in', () => {
    const row = workerRows([worker({ id: 'ghost', checked_at: null })], NOW)[0];
    expect(row.detail).toBe('never checked in');
  });
});

describe('backlogByExecutor', () => {
  it('counts only work that is accepted but not started', () => {
    const backlog = backlogByExecutor([
      depth('boris', 'proposed', 21),
      depth('boris', 'running', 6),      // started — not backlog
      depth('boris', 'completed', 100),  // finished — not backlog
      depth('jeffrey', 'approved', 2),
    ]);
    expect(backlog.get('boris')).toBe(21);
    expect(backlog.get('jeffrey')).toBe(2);
  });
});

describe('healthAlerts', () => {
  // The exact state of 25 Aug 2026: Boris polling but not draining, 21 jobs
  // queued behind it, and nothing anywhere saying so.
  it('escalates a backlog sitting behind an overdue worker', () => {
    const rows = healthAlerts(
      [worker({ id: 'boris', checked_at: agoMin(20) })],
      [depth('boris', 'proposed', 21)],
      [], [], NOW,
    );
    const backlog = rows.find(r => r.id === 'backlog-boris')!;
    expect(backlog.tone).toBe('alert');
    expect(backlog.label).toContain('21 jobs waiting');
  });

  it('keeps a backlog behind a healthy worker at a warning', () => {
    const rows = healthAlerts(
      [worker({ id: 'jeffrey', checked_at: agoMin(2) })],
      [depth('jeffrey', 'approved', 2)],
      [], [], NOW,
    );
    expect(rows.find(r => r.id === 'backlog-jeffrey')!.tone).toBe('warn');
  });

  it('does not vouch for an executor it has no worker for', () => {
    const rows = healthAlerts([], [depth('ralph', 'proposed', 3)], [], [], NOW);
    expect(rows[0].tone).toBe('alert');
  });

  it('flags a job hung past the threshold, longest first', () => {
    const rows = healthAlerts([], [], [
      running({ id: '1', started_at: agoMin(60 * 3) }),
      running({ id: '2', started_at: agoMin(60 * 24 * 26), skill: 'triage/email-triage' }),
      running({ id: '3', started_at: agoMin(10) }), // still working
    ], [], NOW);

    const stuck = rows.filter(r => r.id.startsWith('stuck-'));
    expect(stuck).toHaveLength(2);
    expect(stuck[0].id).toBe('stuck-2');
    expect(stuck[0].detail).toContain('26d');
  });

  // Absent is not zero — the rule this whole panel exists to enforce.
  it('names dead and quiet feeds rather than letting silence pass', () => {
    const rows = healthAlerts([], [], [], [
      signal({ id: 'sleep', label: 'Sleep', status: 'dead', stale_days: 12, last_seen: agoMin(60) }),
      signal({ id: 'pomodoros', label: 'Pomodoros', status: 'quiet' }),
      signal({ id: 'commits', label: 'Commits', status: 'live' }),
    ], NOW);

    expect(rows.find(r => r.id === 'signal-sleep')!.tone).toBe('alert');
    expect(rows.find(r => r.id === 'signal-pomodoros')!.tone).toBe('warn');
    expect(rows.find(r => r.id === 'signal-commits')).toBeUndefined();
  });

  it('is empty when the fleet is genuinely healthy', () => {
    const rows = healthAlerts(
      [worker({ id: 'kipper', checked_at: agoMin(1) })],
      [depth('kipper', 'completed', 40)],
      [running({ id: '9', started_at: agoMin(5) })],
      [signal({ id: 'commits', label: 'Commits', status: 'live' })],
      NOW,
    );
    expect(rows).toEqual([]);
    expect(healthHeadline(rows)).toBe('all clear');
  });
});

describe('headline', () => {
  it('counts each severity separately', () => {
    const rows = healthAlerts(
      [worker({ id: 'boris', checked_at: agoMin(90) })],
      [depth('boris', 'proposed', 5), depth('kipper', 'proposed', 1)],
      [], [], NOW,
    );
    expect(healthHeadline(rows)).toBe('2 needing attention');
  });
});

describe('formatAge', () => {
  it('scales its unit to the magnitude', () => {
    expect(formatAge(45)).toBe('45m');
    expect(formatAge(190)).toBe('3h 10m');
    expect(formatAge(60 * 24 * 26 + 300)).toBe('26d 5h');
  });
});
