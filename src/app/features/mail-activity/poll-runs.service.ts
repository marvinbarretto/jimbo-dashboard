import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

/**
 * One hourly Gmail sweep by the kipper email job (launchd `com.kipper.email`
 * on the M4, formerly com.ralph.email).
 *
 * Runs are not a stored entity of their own: the worker posts an `agent.end`
 * event to /api/events after each sweep, and this service reads those rows
 * back. The payload keys mirror ralph's run summary — see
 * ralph/lib/api_client.py post_run_result.
 */
export interface PollRun {
  id: number;
  ts: string;
  startedAt: string | null;
  durationMs: number | null;
  model: string | null;
  /** Messages the sweep attempted. */
  total: number;
  ok: number;
  errors: number;
  linksFollowed: number;
}

/** Shape of system_events rows as served by GET /api/events. */
interface SystemEvent {
  id: number;
  ts: string;
  kind: string;
  actor: string | null;
  title: string;
  payload: unknown;
}

interface EventListResponse {
  items: SystemEvent[];
  next_cursor: string | null;
}

const DAYS_BACK = 30;

/** The job identity in event payloads. Kept as 'ralph-email' for history
 *  continuity even though the actor and launchd label are now kipper. */
const JOB_ID = 'ralph-email';

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

@Injectable({ providedIn: 'root' })
export class PollRunsService {
  private readonly http = inject(HttpClient);

  readonly runs = signal<PollRun[]>([]);
  readonly loading = signal(false);
  readonly lastError = signal<string | null>(null);

  async load(): Promise<void> {
    this.loading.set(true);
    this.lastError.set(null);
    try {
      const since = new Date(Date.now() - DAYS_BACK * 24 * 60 * 60 * 1000).toISOString();
      const res = await firstValueFrom(
        this.http.get<EventListResponse>(
          `/api/events?source=ralph&kind=agent.end&since=${encodeURIComponent(since)}&limit=1000`,
        ),
      );
      this.runs.set(
        res.items
          .map((e) => this.toRun(e))
          .filter((r): r is PollRun => r !== null),
      );
    } catch (err: unknown) {
      this.lastError.set(err instanceof Error ? err.message : 'Failed to load poll runs');
    } finally {
      this.loading.set(false);
    }
  }

  private toRun(e: SystemEvent): PollRun | null {
    const p = (e.payload ?? {}) as Record<string, unknown>;
    if (p['job_id'] !== JOB_ID) return null;
    return {
      id: e.id,
      ts: e.ts,
      startedAt: typeof p['started_at'] === 'string' ? p['started_at'] : null,
      durationMs: num(p['duration_ms']),
      model: typeof p['model'] === 'string' ? p['model'] : null,
      total: num(p['total']) ?? 0,
      ok: num(p['ok']) ?? 0,
      errors: num(p['errors']) ?? 0,
      linksFollowed: num(p['total_links']) ?? 0,
    };
  }
}
