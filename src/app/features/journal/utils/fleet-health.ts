import type { FleetQueueDepth, FleetRunning, FleetWorker } from '@domain/dispatch';
import type { Signal as DayStreamSignal } from '@domain/day-stream/day-stream';
import type { NotificationEntry } from '@shared/components/notification-bar/notification-bar';

// A worker that has not checked in for this long is not resting.
export const WORKER_LATE_MIN = 15;
export const WORKER_LOST_MIN = 60;
// Dispatches are minutes of work. Hours means hung, not busy.
export const JOB_STUCK_HOURS = 2;
/**
 * Statuses where a *worker* is the thing standing between the job and being
 * done. `approved` and `dispatching` qualify; `proposed` does not.
 *
 * That distinction is the whole point. A dispatch lands as `proposed` unless
 * auto-approve is on, so proposals pile up waiting on Marvin, not on Boris —
 * and reporting them as "nothing is picking them up" blames a worker that is
 * polling normally. This panel exists to stop false alarms, so it must not
 * manufacture one out of a workflow state.
 */
const WAITING_STATUSES = new Set(['approved', 'dispatching']);

/** Awaiting a human decision, not a worker. Shown, but never as a fault. */
const APPROVAL_STATUSES = new Set(['proposed']);

export type HealthTone = 'ok' | 'warn' | 'alert';

export interface HealthRow {
  readonly id: string;
  readonly label: string;
  readonly detail: string;
  /** What should be true. Stated even when it is, so the row is checkable. */
  readonly expectation: string;
  readonly tone: HealthTone;
}

/**
 * Minutes since an ISO instant.
 *
 * @param iso - The instant, or null when it never happened
 * @param now - Reference time
 * @returns Whole minutes, or null when there is nothing to measure from
 */
export function minutesSince(iso: string | null, now: Date): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? Math.max(0, Math.round((now.getTime() - ms) / 60_000)) : null;
}

/** Compact age: 45m, 3h 10m, 26d 5h. */
export function formatAge(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ${mins % 60}m`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

/**
 * One row per worker, judged against an expected check-in cadence.
 *
 * A cooldown worker is deliberately quiet — quota-throttled, not lost — so it
 * must never be alarmed on, or the panel cries wolf every time the fleet
 * throttles itself.
 *
 * @param workers - Worker heartbeats from the fleet stats feed
 * @param now - Reference time
 * @returns Rows in the order given
 */
export function workerRows(workers: readonly FleetWorker[], now: Date): HealthRow[] {
  return workers.map(w => {
    const mins = minutesSince(w.checked_at, now);
    const cooling = w.status === 'cooldown' || w.next_poll_at !== null;
    const suspended = activeSuspension(w, now);

    // A suspension changes the expectation; it does not hide the row. The
    // worker is still listed, still shows how long it has been quiet, and
    // still says when it is due back — it simply stops reading as a fault,
    // because being down is what was predicted.
    const tone: HealthTone = suspended || cooling || mins === null ? 'ok'
      : mins >= WORKER_LOST_MIN ? 'alert'
      : mins >= WORKER_LATE_MIN ? 'warn'
      : 'ok';

    return {
      id: `worker-${w.id}`,
      label: `${w.id}${w.machine ? ` · ${w.machine}` : ''}`,
      detail: suspended
        ? `${suspended.reason} · quiet ${mins === null ? 'throughout' : formatAge(mins)}`
        : mins === null
          ? 'never checked in'
          : `${w.status ?? 'unknown'} · last seen ${formatAge(mins)} ago`,
      expectation: suspended
        ? `back ${formatUntil(suspended.until, now)}`
        : cooling ? 'cooling down'
        : `every ${WORKER_LATE_MIN}m`,
      tone,
    };
  });
}

/** The suspension if it is still in force — a lapsed one is no suspension. */
export function activeSuspension(
  worker: FleetWorker,
  now: Date,
): { reason: string; until: string } | null {
  const suspended = worker.suspended ?? null;
  if (!suspended) return null;
  const until = Date.parse(suspended.until);
  return Number.isFinite(until) && until > now.getTime() ? suspended : null;
}

/** "back in 9 days" / "back tomorrow" — an expiry a reader can act on. */
function formatUntil(until: string, now: Date): string {
  const days = Math.round((Date.parse(until) - now.getTime()) / 86_400_000);
  if (days <= 0) return 'imminently';
  if (days === 1) return 'tomorrow';
  return `in ${days} days`;
}

/** Approved but unstarted work per executor — what a stalled worker leaves behind. */
export function backlogByExecutor(queue: readonly FleetQueueDepth[]): Map<string, number> {
  return countByExecutor(queue, WAITING_STATUSES);
}

/** Dispatches still awaiting approval, per executor. A queue for Marvin. */
export function awaitingApproval(queue: readonly FleetQueueDepth[]): Map<string, number> {
  return countByExecutor(queue, APPROVAL_STATUSES);
}

function countByExecutor(
  queue: readonly FleetQueueDepth[],
  statuses: ReadonlySet<string>,
): Map<string, number> {
  const out = new Map<string, number>();
  for (const q of queue) {
    if (!statuses.has(q.status)) continue;
    const key = q.executor ?? 'unassigned';
    out.set(key, (out.get(key) ?? 0) + q.count);
  }
  return out;
}

/**
 * Everything currently wrong, loudest first.
 *
 * Ordered backlog → hung jobs → dead feeds → quiet feeds, because that is
 * roughly descending order of "work is not happening". A backlog behind an
 * overdue worker is the one state that means the fleet has stopped, so it is
 * the only row that escalates on the strength of another row's verdict.
 *
 * @param workers - Worker heartbeats
 * @param queue - Queue depths by executor and status
 * @param running - Jobs currently marked running
 * @param signals - Day-stream registry signals
 * @param now - Reference time
 * @returns Alert rows; empty means genuinely nothing overdue
 */
export function healthAlerts(
  workers: readonly FleetWorker[],
  queue: readonly FleetQueueDepth[],
  running: readonly FleetRunning[],
  signals: readonly DayStreamSignal[],
  now: Date,
): HealthRow[] {
  const rows: HealthRow[] = [];
  const byWorker = new Map(workerRows(workers, now).map(r => [r.id, r]));

  const suspensions = new Map(
    workers.map(w => [w.id, activeSuspension(w, now)] as const),
  );

  for (const [executor, count] of backlogByExecutor(queue)) {
    if (count === 0) continue;
    const suspension = suspensions.get(executor) ?? null;
    // An unknown executor cannot be vouched for, so a backlog behind one is
    // treated as stalled rather than assumed healthy.
    const idle = (byWorker.get(`worker-${executor}`)?.tone ?? 'alert') !== 'ok';

    rows.push({
      id: `backlog-${executor}`,
      label: `${executor} has ${count} job${count === 1 ? '' : 's'} waiting`,
      // Still shown while suspended, deliberately. Knowing how much has piled
      // up is the useful part; the only thing that changes is that it is no
      // longer a surprise.
      detail: suspension
        ? `piling up while suspended — ${suspension.reason}`
        : idle
          ? 'and the worker is overdue a check-in — nothing is picking them up'
          : 'accepted but not started',
      expectation: suspension ? 'expected to accumulate' : 'drains continuously',
      tone: suspension ? 'ok' : idle ? 'alert' : 'warn',
    });
  }

  for (const [executor, count] of awaitingApproval(queue)) {
    if (count === 0) continue;
    rows.push({
      id: `approval-${executor}`,
      label: `${count} dispatch${count === 1 ? '' : 'es'} awaiting approval`,
      detail: `proposed for ${executor} — waiting on a decision, not on the worker`,
      expectation: 'yours to approve or reject',
      tone: 'warn',
    });
  }

  const stuck = running
    .map(job => ({ job, mins: minutesSince(job.started_at, now) }))
    .filter((r): r is { job: FleetRunning; mins: number } =>
      r.mins !== null && r.mins >= JOB_STUCK_HOURS * 60)
    .sort((a, b) => b.mins - a.mins);

  for (const { job, mins } of stuck) {
    rows.push({
      id: `stuck-${job.id}`,
      label: `${job.skill ?? job.flow} stuck running`,
      detail: `${job.executor ?? 'unassigned'} · ${job.note_title ?? job.task_id} · started ${formatAge(mins)} ago`,
      // Hung jobs hold a concurrency slot, so they block new work as well as
      // failing to finish their own — why this is an alert, not a note.
      expectation: `under ${JOB_STUCK_HOURS}h`,
      tone: 'alert',
    });
  }

  // Absent is not zero: a dead collector reports nothing, which every chart
  // downstream renders as a calm zero unless it is named here.
  for (const s of signals) {
    if (s.status === 'dead') {
      rows.push({
        id: `signal-${s.id}`,
        label: `${s.label} is not reporting`,
        detail: s.last_seen
          ? `last produced anything ${s.stale_days ?? '?'} days ago`
          : 'has never produced anything',
        expectation: 'reports daily',
        tone: 'alert',
      });
    } else if (s.status === 'quiet') {
      rows.push({
        id: `signal-${s.id}`,
        label: `${s.label} has gone quiet`,
        detail: 'still reporting, but produced nothing today',
        expectation: 'reports daily',
        tone: 'warn',
      });
    }
  }

  return rows;
}

/** "2 needing attention · 1 to watch", or "all clear". */
export function healthHeadline(rows: readonly HealthRow[]): string {
  const alerts = rows.filter(r => r.tone === 'alert').length;
  const warns = rows.filter(r => r.tone === 'warn').length;
  if (!alerts && !warns) return 'all clear';
  return [alerts ? `${alerts} needing attention` : null, warns ? `${warns} to watch` : null]
    .filter(Boolean).join(' · ');
}

/**
 * The subset of fleet health urgent enough to interrupt.
 *
 * Deliberately narrower than {@link healthAlerts}. The notification bar pushes
 * the whole page down, which is what makes it effective and what makes it
 * intolerable when over-used — so only conditions that mean *work is not
 * happening right now* qualify.
 *
 * Excluded on purpose: dead and quiet collectors. A feed that has been dead for
 * twelve days is a standing fact, not news, and a permanent undismissable row
 * about it would train the reader to ignore the bar entirely. Those live on the
 * Jimbo tab, where looking is the deliberate act.
 *
 * Every entry is non-dismissible, because each describes something still true.
 * A dismiss would silence a live outage rather than resolve it; these clear
 * themselves the moment the underlying state does.
 *
 * @param workers - Worker heartbeats
 * @param queue - Queue depths by executor and status
 * @param running - Jobs currently marked running
 * @param now - Reference time
 * @returns Notification-bar entries, most urgent first
 */
export function healthNotifications(
  workers: readonly FleetWorker[],
  queue: readonly FleetQueueDepth[],
  running: readonly FleetRunning[],
  now: Date,
): NotificationEntry[] {
  const rows: NotificationEntry[] = [];
  const byWorker = new Map(workerRows(workers, now).map(r => [r.id, r]));

  for (const w of workers) {
    // Suspended workers never reach the bar. The Jimbo panel still lists them,
    // which is the distinction that keeps this honest: declared outages are
    // visible where you go to look, and absent where you are interrupted.
    if (activeSuspension(w, now)) continue;
    const tone = byWorker.get(`worker-${w.id}`)?.tone;
    if (tone !== 'alert') continue;
    const mins = minutesSince(w.checked_at, now);
    rows.push({
      id: `health-worker-${w.id}`,
      source: 'Fleet',
      message: `${w.id}${w.machine ? ` on ${w.machine}` : ''} has not checked in for ${mins === null ? 'ever' : formatAge(mins)}`,
      tone: 'danger',
      href: '/fleet',
      dismissible: false,
      standingHint: 'Clears when the worker checks in again',
    });
  }

  for (const [executor, count] of backlogByExecutor(queue)) {
    if (count === 0) continue;
    // Only when nothing is picking the work up. A backlog behind a healthy
    // worker is a busy queue, and one behind a suspended worker is exactly
    // what was predicted — neither is an emergency.
    if ((byWorker.get(`worker-${executor}`)?.tone ?? 'alert') === 'ok') continue;
    rows.push({
      id: `health-backlog-${executor}`,
      source: 'Fleet',
      message: `${count} job${count === 1 ? '' : 's'} waiting on ${executor} and nothing is picking them up`,
      tone: 'danger',
      href: '/fleet',
      count,
      dismissible: false,
      standingHint: 'Clears when the queue starts draining',
    });
  }

  // One row for all hung jobs, never one each: six stuck dispatches are a
  // single problem, and six rows would bury everything else in the bar.
  const stuck = running
    .map(job => minutesSince(job.started_at, now))
    .filter((m): m is number => m !== null && m >= JOB_STUCK_HOURS * 60)
    .sort((a, b) => b - a);

  if (stuck.length > 0) {
    rows.push({
      id: 'health-stuck-jobs',
      source: 'Fleet',
      message: `${stuck.length} job${stuck.length === 1 ? '' : 's'} hung — oldest running ${formatAge(stuck[0])}`,
      tone: 'warning',
      href: '/fleet',
      count: stuck.length,
      dismissible: false,
      standingHint: 'Clears when the jobs finish or are reaped',
    });
  }

  return rows;
}
