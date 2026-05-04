import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

// Slim shape of what the dashboard cares about — full HermesJob has many
// more fields (run history, schedule, etc) we don't need for ID-to-name.
export interface CronJob {
  id: string;
  name: string;
  skill: string | null;
  skills: string[] | null;
  model: string | null;
}

interface CronJobsResponse {
  items: CronJob[];
}

// Job-list refresh cadence. Cron jobs change infrequently — slow refresh
// is fine, and the lookup is mostly used for display, not gating.
const REFRESH_INTERVAL_MS = 5 * 60_000;

// Session ID format: `cron_<JOBHASH>_<YYYYMMDD>_<HHMMSS>`. The middle
// hash is the cron job's hermes-side id — directly resolvable via the
// jobs map we fetch.
const SESSION_ID_RE = /^cron_([a-f0-9]+)_/;

export function jobIdFromSessionId(sessionId: string | null | undefined): string | null {
  if (!sessionId) return null;
  const m = sessionId.match(SESSION_ID_RE);
  return m ? m[1] : null;
}

@Injectable({ providedIn: 'root' })
export class CronJobsService {
  private readonly http = inject(HttpClient);

  private readonly _jobs = signal<CronJob[]>([]);
  private readonly _loading = signal(false);
  private readonly _lastError = signal<string | null>(null);

  readonly jobs = this._jobs.asReadonly();
  readonly loading = this._loading.asReadonly();

  // id → CronJob, recomputed on every job-list update. Pipes read this
  // through the service, so a single fetch fans out to every row.
  readonly byId = computed(() => {
    const map = new Map<string, CronJob>();
    for (const j of this._jobs()) map.set(j.id, j);
    return map;
  });

  private timerHandle: ReturnType<typeof setInterval> | null = null;
  private started = false;

  start(): void {
    if (this.started) return;
    this.started = true;
    void this.refresh();
    this.timerHandle = setInterval(() => void this.refresh(), REFRESH_INTERVAL_MS);
  }

  stop(): void {
    if (this.timerHandle !== null) {
      clearInterval(this.timerHandle);
      this.timerHandle = null;
    }
    this.started = false;
  }

  /** Resolve a session_id to its cron job, or null if unresolvable. */
  jobForSessionId(sessionId: string | null | undefined): CronJob | null {
    const id = jobIdFromSessionId(sessionId);
    if (!id) return null;
    return this.byId().get(id) ?? null;
  }

  async refresh(): Promise<void> {
    this._loading.set(true);
    this._lastError.set(null);
    try {
      const response = await firstValueFrom(
        this.http.get<CronJobsResponse>(
          `${environment.dashboardApiUrl}/api/hermes/jobs`,
        ),
      );
      this._jobs.set(response.items ?? []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'fetch failed';
      this._lastError.set(msg);
    } finally {
      this._loading.set(false);
    }
  }
}
