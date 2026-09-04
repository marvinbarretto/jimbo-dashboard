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

/**
 * Statuses meaning "ran, and deliberately chose not to work".
 *
 * `cooldown` is a quota throttle; `gated` is Kipper's launchd runner finding
 * the laptop on battery. Both are the worker doing exactly what it should, and
 * alarming on either teaches the reader to ignore the panel.
 *
 * The distinction from silence matters: a gated worker still checks in. It is
 * only quiet about *work*, never about itself — which is the whole reason the
 * gate was changed to report rather than exit.
 */
const IDLE_BY_DESIGN = new Set(['cooldown', 'gated']);

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
    const idleByDesign = IDLE_BY_DESIGN.has(w.status ?? '');
    // "Parked" is a promise with a deadline: cooldown says "back at T". Until T
    // it is calm; past T it has broken its own word and the thresholds apply
    // again.
    const parkedUntil = w.next_poll_at ? Date.parse(w.next_poll_at) : NaN;
    const parked = Number.isFinite(parkedUntil) && parkedUntil > now.getTime();
    const suspended = activeSuspension(w, now);

    // A suspension changes the expectation; it does not hide the row. The
    // worker is still listed, still shows how long it has been quiet, and
    // still says when it is due back — it simply stops reading as a fault,
    // because being down is what was predicted.
    // Standing down from *work* is not standing down from *reporting*. A gated
    // worker still ticks every five minutes; if it goes quiet altogether its
    // runner has died, which is a real outage and must still fire. Only an
    // explicit suspension or an unexpired park suppresses the thresholds.
    const tone: HealthTone = suspended || parked || mins === null ? 'ok'
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
        // The worker's own words where it gave them: it knows why it stood
        // down, and repeating that beats a generic label.
        : idleByDesign || parked ? (w.reason ?? 'idle by design')
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

/** The longest-running job an executor currently holds, if any. */
function longestRunningFor(
  executor: string,
  running: readonly FleetRunning[],
  now: Date,
): { skill: string; mins: number | null } | null {
  return running
    .filter(j => (j.executor ?? 'unassigned') === executor)
    .map(j => ({ skill: j.skill ?? j.flow, mins: minutesSince(j.started_at, now) }))
    .sort((a, b) => (b.mins ?? 0) - (a.mins ?? 0))[0] ?? null;
}

/**
 * Why an executor's queue is not moving, stated as an observation.
 *
 * "Nothing is picking them up" is the strongest claim this panel makes, and it
 * used to be asserted from the heartbeat alone — a worker anything but `ok`
 * with jobs queued was declared abandoned, and the reader was given no
 * evidence to check that against. Two things were wrong with that.
 *
 * The first is a plain omission: a worker holding a job is picking work up,
 * whatever its heartbeat says. The heartbeat updates when it polls, not when
 * it claims, so a 30-minute dispatch reads as 30 minutes of silence — and the
 * panel called that worker dead while it was visibly doing the work.
 *
 * The second is that even when the claim was right, it read as a diagnosis
 * rather than a reading. So every branch now says what was actually seen — the
 * job in flight, or how long the silence has run — and the reader can tell a
 * worker between jobs from a worker that has stopped.
 *
 * @param executor - Executor owning the queue
 * @param tone - The worker's own health tone; `ok` means checking in normally
 * @param workers - Worker heartbeats
 * @param running - Jobs currently marked running
 * @param now - Reference time
 * @returns A reason phrase, and whether the queue is genuinely abandoned
 */
function backlogReason(
  executor: string,
  tone: HealthTone,
  workers: readonly FleetWorker[],
  running: readonly FleetRunning[],
  now: Date,
): { reason: string; abandoned: boolean } {
  const job = longestRunningFor(executor, running, now);
  if (job) {
    const age = job.mins === null ? null : formatAge(job.mins);
    // Work in flight normally settles it — but only while it is still work. A
    // job past the hang threshold holds the executor's slot without finishing,
    // so the queue behind it is as stalled as one behind a dead worker.
    // Calling that "running behind, not abandoned" would be exactly the kind
    // of false reassurance this function exists to remove — and the reader
    // cannot rely on the stuck-job row to correct it, since that row can be
    // pushed past the bar's visible limit.
    if (job.mins !== null && job.mins >= JOB_STUCK_HOURS * 60) {
      return {
        reason: `${job.skill} has been running ${age} and is hung — nothing else is being picked up`,
        abandoned: true,
      };
    }
    return {
      reason: `busy on ${job.skill}${age === null ? '' : ` for ${age}`} — running behind, not abandoned`,
      abandoned: false,
    };
  }

  const worker = workers.find(w => w.id === executor) ?? null;
  // An unknown executor cannot be vouched for: nobody has claimed the queue.
  if (!worker) return { reason: `no worker named ${executor} is reporting`, abandoned: true };

  const quiet = minutesSince(worker.checked_at, now);
  const since = quiet === null ? 'has never checked in' : `last check-in ${formatAge(quiet)} ago`;
  if (tone === 'ok') return { reason: `accepted but not started — ${since}`, abandoned: false };

  // The worker's own status is quoted even though nothing is running, because
  // the contradiction is the diagnosis: "executing" with an empty run list is
  // a worker whose job was reaped out from under it and which has not come
  // back to poll.
  return {
    reason: `nothing running and ${since} (${worker.status ?? 'status unknown'}) — nothing is picking them up`,
    abandoned: true,
  };
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
    const tone = byWorker.get(`worker-${executor}`)?.tone ?? 'alert';
    const { reason, abandoned } = backlogReason(executor, tone, workers, running, now);

    rows.push({
      id: `backlog-${executor}`,
      label: `${executor} has ${count} job${count === 1 ? '' : 's'} waiting`,
      // Still shown while suspended, deliberately. Knowing how much has piled
      // up is the useful part; the only thing that changes is that it is no
      // longer a surprise.
      detail: suspension ? `piling up while suspended — ${suspension.reason}` : reason,
      expectation: suspension ? 'expected to accumulate' : 'drains continuously',
      tone: suspension ? 'ok' : abandoned ? 'alert' : 'warn',
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
    // A backlog behind a healthy worker is a busy queue, and one behind a
    // suspended worker is exactly what was predicted — neither is an emergency.
    const tone = byWorker.get(`worker-${executor}`)?.tone ?? 'alert';
    if (tone === 'ok') continue;
    const { reason, abandoned } = backlogReason(executor, tone, workers, running, now);
    rows.push({
      id: `health-backlog-${executor}`,
      source: 'Fleet',
      message: `${count} job${count === 1 ? '' : 's'} waiting on ${executor} — ${reason}`,
      // Only an abandoned queue is an outage. A queue behind a worker that is
      // late but still holding work is running behind, and colouring that the
      // same red as a dead worker is what made the bar unreadable.
      tone: abandoned ? 'danger' : 'warning',
      href: '/fleet',
      count,
      dismissible: false,
      standingHint: abandoned
        ? 'Clears when a worker picks the queue up again'
        : 'Clears when the queue starts draining',
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
