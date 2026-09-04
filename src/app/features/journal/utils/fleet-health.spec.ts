import { describe, expect, it } from 'vitest';
import type { FleetQueueDepth, FleetRunning, FleetWorker } from '@domain/dispatch';
import type { Signal as DayStreamSignal } from '@domain/day-stream/day-stream';
import { awaitingApproval, backlogByExecutor, formatAge, healthAlerts, healthHeadline, healthNotifications, workerRows } from './fleet-health';

// Fixed clock throughout — a health panel that behaves differently depending on
// when the suite runs is the last thing that should be flaky.
const NOW = new Date('2026-08-25T23:37:00Z');
const agoMin = (m: number) => new Date(NOW.getTime() - m * 60_000).toISOString();

const worker = (p: Partial<FleetWorker> & { id: string }): FleetWorker => ({
  machine: 'm2', status: 'polling', checked_at: agoMin(1), next_poll_at: null,
  suspended: null, reason: null, ...p,
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
  it('never alarms on a worker parked until a stated time', () => {
    const parked = worker({
      id: 'jeffrey', status: 'cooldown', checked_at: agoMin(240),
      next_poll_at: new Date(NOW.getTime() + 5 * 60_000).toISOString(),
    });
    const row = workerRows([parked], NOW)[0];
    expect(row.tone).toBe('ok');
  });

  // Cooldown is a promise with a deadline. Past it, the worker has broken its
  // own word, and "I'll be back at 3" four hours ago is indistinguishable from
  // a worker that died at 3.
  it('alarms once a parked worker overruns its own return time', () => {
    const overdue = worker({
      id: 'jeffrey', status: 'cooldown', checked_at: agoMin(240),
      next_poll_at: new Date(NOW.getTime() - 60 * 60_000).toISOString(),
    });
    expect(workerRows([overdue], NOW)[0].tone).toBe('alert');
  });

  it('says so when a worker has never checked in', () => {
    const row = workerRows([worker({ id: 'ghost', checked_at: null })], NOW)[0];
    expect(row.detail).toBe('never checked in');
  });
});

describe('backlogByExecutor', () => {
  it('counts only work that is accepted but not started', () => {
    const backlog = backlogByExecutor([
      depth('boris', 'approved', 21),
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
      [depth('boris', 'approved', 21)],
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
    const rows = healthAlerts([], [depth('ralph', 'approved', 3)], [], [], NOW);
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
      [depth('boris', 'approved', 5), depth('kipper', 'approved', 1)],
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

describe('healthNotifications', () => {
  it('raises a standing row for a lost worker', () => {
    const rows = healthNotifications([worker({ id: 'boris', checked_at: agoMin(120) })], [], [], NOW);
    expect(rows).toHaveLength(1);
    expect(rows[0].message).toContain('has not checked in for 2h');
    // Non-dismissible on purpose: the outage is still happening.
    expect(rows[0].dismissible).toBe(false);
  });

  it('stays silent while workers are checking in', () => {
    expect(healthNotifications([worker({ id: 'kipper', checked_at: agoMin(1) })], [], [], NOW)).toEqual([]);
  });

  // A busy queue is not an emergency. Only a queue nothing is draining is.
  it('only raises a backlog when nothing is picking the work up', () => {
    const healthy = healthNotifications(
      [worker({ id: 'jeffrey', checked_at: agoMin(2) })],
      [depth('jeffrey', 'approved', 40)], [], NOW);
    expect(healthy).toEqual([]);

    const stalled = healthNotifications(
      [worker({ id: 'boris', checked_at: agoMin(120) })],
      [depth('boris', 'approved', 21)], [], NOW);
    expect(stalled.some(r => r.message.includes('21 jobs waiting on boris'))).toBe(true);
  });

  // The heartbeat updates on poll, not on claim, so a worker part-way through
  // a 30-minute dispatch looks silent. Calling that "nothing is picking them
  // up" accused a worker of being dead while it was visibly doing the work.
  it('never claims a queue is abandoned while the worker holds a job', () => {
    const rows = healthNotifications(
      [worker({ id: 'jeffrey', checked_at: agoMin(36) })],
      [depth('jeffrey', 'approved', 3)],
      [running({ id: '1', executor: 'jeffrey', skill: 'dispatch/vault-decompose', started_at: agoMin(32) })],
      NOW);

    const backlog = rows.find(r => r.id === 'health-backlog-jeffrey')!;
    expect(backlog.message).toBe(
      '3 jobs waiting on jeffrey — busy on dispatch/vault-decompose for 32m — running behind, not abandoned');
    expect(backlog.tone).toBe('warning');
  });

  // The claim survives where it is true — but it now carries the reading it
  // was drawn from, so "dead worker" and "worker between jobs" stop looking
  // identical to the reader.
  it('shows the evidence behind an abandoned queue rather than only the verdict', () => {
    const rows = healthNotifications(
      [worker({ id: 'boris', checked_at: agoMin(91) })],
      [depth('boris', 'approved', 1)], [], NOW);

    const backlog = rows.find(r => r.id === 'health-backlog-boris')!;
    expect(backlog.message).toBe(
      '1 job waiting on boris — nothing running and last check-in 1h 31m ago (polling) — nothing is picking them up');
    expect(backlog.tone).toBe('danger');
  });

  // Six stuck dispatches are one problem. Six rows would bury everything else.
  it('collapses every hung job into a single row', () => {
    const rows = healthNotifications([], [], [
      running({ id: '1', started_at: agoMin(60 * 5) }),
      running({ id: '2', started_at: agoMin(60 * 24 * 26) }),
      running({ id: '3', started_at: agoMin(60 * 9) }),
      running({ id: '4', started_at: agoMin(5) }), // still working
    ], NOW);

    expect(rows).toHaveLength(1);
    expect(rows[0].count).toBe(3);
    expect(rows[0].message).toContain('oldest running 26d');
  });

  // Standing facts, not news. A permanent undismissable row about a feed that
  // died a fortnight ago trains the reader to ignore the bar.
  it('keeps dead feeds out of the bar entirely', () => {
    const rows = healthNotifications([worker({ id: 'kipper', checked_at: agoMin(1) })], [], [], NOW);
    expect(rows).toEqual([]);
  });

  it('never offers a dismiss on a standing condition', () => {
    const rows = healthNotifications(
      [worker({ id: 'boris', checked_at: agoMin(200) })],
      [depth('boris', 'approved', 21)],
      [running({ id: '1', started_at: agoMin(600) })],
      NOW);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every(r => r.dismissible === false)).toBe(true);
    expect(rows.every(r => r.standingHint !== null)).toBe(true);
    // A 10h job is not "busy". It holds the slot, so the queue behind it is
    // stalled — and the backlog row must not reassure while the stuck-job row
    // does the alarming, since that row can be scrolled out of the bar.
    expect(rows.find(r => r.id === 'health-backlog-boris')!.message).toContain('is hung');
  });
});

// Boris's machine is off for a week. Every hour of that would otherwise be an
// alert saying nothing is picking the work up — true, already known, and
// exactly the noise that teaches a reader to ignore the panel.
describe('suspension', () => {
  const suspended = (untilMin: number, reason = 'M2 off') =>
    worker({
      id: 'boris',
      checked_at: agoMin(600),
      suspended: { reason, until: new Date(NOW.getTime() + untilMin * 60_000).toISOString() },
    });

  it('calms a worker that was expected to be down', () => {
    const row = workerRows([suspended(60 * 24 * 9)], NOW)[0];
    expect(row.tone).toBe('ok');
    expect(row.expectation).toBe('back in 9 days');
    // Still reports how long it has been quiet — declared, not hidden.
    expect(row.detail).toContain('M2 off');
    expect(row.detail).toContain('10h');
  });

  // The expiry is the load-bearing part: an open-ended mute is how a fleet
  // ends up with no alarms at all.
  it('alerts again once the suspension lapses', () => {
    const row = workerRows([suspended(-1)], NOW)[0];
    expect(row.tone).toBe('alert');
  });

  it('treats the backlog as expected accumulation, still visible', () => {
    const rows = healthAlerts([suspended(60 * 24 * 9)], [depth('boris', 'approved', 21)], [], [], NOW);
    const backlog = rows.find(r => r.id === 'backlog-boris')!;

    expect(backlog.tone).toBe('ok');
    expect(backlog.label).toContain('21 jobs waiting');
    expect(backlog.expectation).toBe('expected to accumulate');
  });

  // Visible where you go to look; absent where you are interrupted.
  it('never reaches the notification bar', () => {
    const rows = healthNotifications([suspended(60 * 24 * 9)], [depth('boris', 'approved', 21)], [], NOW);
    expect(rows).toEqual([]);
  });

  it('reaches the bar again once it lapses', () => {
    const rows = healthNotifications([suspended(-1)], [depth('boris', 'approved', 21)], [], NOW);
    expect(rows.length).toBeGreaterThan(0);
  });
});

// A dispatch lands as `proposed` unless auto-approve is on, so proposals queue
// on Marvin's decision, not on a worker. Reporting them as "nothing is picking
// them up" blames a worker that is polling perfectly well — a false alarm from
// the panel built to stop false alarms.
describe('approval queue vs worker backlog', () => {
  it('does not treat proposals as a stalled worker', () => {
    const rows = healthAlerts(
      [worker({ id: 'boris', checked_at: agoMin(120) })],
      [depth('boris', 'proposed', 21)],
      [], [], NOW,
    );
    expect(rows.find(r => r.id === 'backlog-boris')).toBeUndefined();
  });

  it('surfaces them as a decision waiting on Marvin', () => {
    const rows = healthAlerts([worker({ id: 'boris' })], [depth('boris', 'proposed', 21)], [], [], NOW);
    const row = rows.find(r => r.id === 'approval-boris')!;

    expect(row.label).toContain('21 dispatches awaiting approval');
    expect(row.expectation).toBe('yours to approve or reject');
    // Never an alert: nothing is broken.
    expect(row.tone).toBe('warn');
  });

  it('keeps them out of the notification bar', () => {
    const rows = healthNotifications(
      [worker({ id: 'boris', checked_at: agoMin(200) })],
      [depth('boris', 'proposed', 21)],
      [], NOW,
    );
    expect(rows.some(r => r.id.startsWith('health-backlog'))).toBe(false);
  });

  it('still counts approved work as worker backlog', () => {
    expect(backlogByExecutor([depth('boris', 'approved', 4), depth('boris', 'dispatching', 1)]).get('boris')).toBe(5);
    expect(awaitingApproval([depth('boris', 'proposed', 21)]).get('boris')).toBe(21);
  });
});

// Kipper's launchd runner fires every five minutes and works only on mains
// power. It used to exit silently when on battery, so fifteen hours of exactly
// correct behaviour rendered as a dead worker.
describe('idle by design', () => {
  it('stays calm for a gated worker and repeats its own reason', () => {
    const row = workerRows([worker({
      id: 'kipper', machine: 'm4', status: 'gated',
      reason: 'on battery — waiting for mains', checked_at: agoMin(3),
    })], NOW)[0];

    expect(row.tone).toBe('ok');
    expect(row.expectation).toBe('on battery — waiting for mains');
  });

  // A gated worker is quiet about work, never about itself. If it stops
  // checking in altogether, that is a real outage and must still fire.
  it('still alerts when a gated worker stops checking in', () => {
    const row = workerRows([worker({
      id: 'kipper', status: 'gated', reason: 'on battery', checked_at: agoMin(90),
    })], NOW)[0];

    expect(row.tone).toBe('alert');
  });

  it('falls back to a plain label when no reason is given', () => {
    const row = workerRows([worker({ id: 'jeffrey', status: 'cooldown', checked_at: agoMin(2) })], NOW)[0];
    expect(row.expectation).toBe('idle by design');
  });

  it('keeps a gated worker calm while it is still ticking', () => {
    const row = workerRows([worker({
      id: 'kipper', status: 'gated', reason: 'on battery', checked_at: agoMin(4),
    })], NOW)[0];
    expect(row.tone).toBe('ok');
  });
});
