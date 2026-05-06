import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { HermesService } from '../hermes/data-access/hermes.service';
import type { HermesJob } from '../hermes/hermes.types';

export type { HermesJob };

// Session ID format: `cron_<JOBHASH>_<YYYYMMDD>_<HHMMSS>`. The middle
// hash is the cron job's hermes-side id — directly resolvable via the
// jobs map we fetch.
const SESSION_ID_RE = /^cron_([a-f0-9]+)_/;

export function jobIdFromSessionId(sessionId: string | null | undefined): string | null {
  if (!sessionId) return null;
  const m = sessionId.match(SESSION_ID_RE);
  return m ? m[1] : null;
}

// A job is "stale" when its scheduler should have ticked but didn't.
// The detection is parameterless: we use last_run_at + next_run_at to
// estimate the period, then flag if overdue by more than half the
// period. Falls back to a flat 30-min tolerance for never-run jobs.
//
// Why this shape over parsing schedule_display: cron expressions and
// "every Nm" both end up as the same `next_run_at - last_run_at` delta
// once the scheduler has ticked once, and the gateway is the source of
// truth. Anything we'd parse here is guessing what the scheduler did.
export interface StaleJob {
  job: HermesJob;
  // Milliseconds past `next_run_at` (always > 0 for stale rows).
  overdueMs: number;
  // Estimated period (next_run_at − last_run_at); null when no
  // last_run_at exists and we're using the flat tolerance.
  periodMs: number | null;
}

const FLAT_TOLERANCE_MS = 30 * 60_000;
const MIN_TOLERANCE_MS = 2 * 60_000;
const TICK_INTERVAL_MS = 30_000;

function staleness(job: HermesJob, nowMs: number): StaleJob | null {
  // Only flag jobs the scheduler is supposed to be running. The
  // scheduler skips `enabled: false` silently in get_due_jobs(), so a
  // disabled job is intentionally off — not stale. Same for paused.
  // We only alarm on jobs that should be ticking but aren't.
  if (!job.enabled) return null;
  if (job.state !== 'scheduled' && job.state !== 'running') return null;
  if (!job.next_run_at) return null;

  const nextMs = new Date(job.next_run_at).getTime();
  const overdueMs = nowMs - nextMs;
  if (overdueMs <= 0) return null;

  if (job.last_run_at) {
    const lastMs = new Date(job.last_run_at).getTime();
    const periodMs = nextMs - lastMs;
    // Half-period tolerance, with a 2-minute floor for sub-5min jobs
    // (avoids false positives from the 60s tick interval).
    const tolerance = Math.max(MIN_TOLERANCE_MS, periodMs * 0.5);
    if (overdueMs <= tolerance) return null;
    return { job, overdueMs, periodMs };
  }

  if (overdueMs <= FLAT_TOLERANCE_MS) return null;
  return { job, overdueMs, periodMs: null };
}

@Injectable({ providedIn: 'root' })
export class CronJobsService {
  private readonly hermes = inject(HermesService);

  // Live job list — sourced from HermesService's 10s poll. Single
  // upstream owner avoids two parallel polls of the same endpoint.
  readonly jobs = this.hermes.jobs;

  // id → HermesJob.
  readonly byId = computed(() => {
    const map = new Map<string, HermesJob>();
    for (const j of this.jobs()) map.set(j.id, j);
    return map;
  });

  // Wall-clock signal that ticks every 30s. Drives staleness
  // recomputation independently of the jobs poll, so a row's "5m
  // overdue" label keeps climbing even when the API is silent.
  private readonly _now = signal(Date.now());

  readonly staleJobs = computed<StaleJob[]>(() => {
    const now = this._now();
    return this.jobs()
      .map((j) => staleness(j, now))
      .filter((s): s is StaleJob => s !== null)
      .sort((a, b) => b.overdueMs - a.overdueMs);
  });

  constructor() {
    const handle = setInterval(() => this._now.set(Date.now()), TICK_INTERVAL_MS);
    inject(DestroyRef).onDestroy(() => clearInterval(handle));
  }

  jobForSessionId(sessionId: string | null | undefined): HermesJob | null {
    const id = jobIdFromSessionId(sessionId);
    if (!id) return null;
    return this.byId().get(id) ?? null;
  }

  triggerJob(jobId: string): Promise<{ triggered: string }> {
    return firstValueFrom(this.hermes.trigger(jobId));
  }
}
