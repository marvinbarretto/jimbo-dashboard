import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

/**
 * One hourly Gmail sweep by the kipper email job (launchd `com.kipper.email`
 * on the M4, formerly com.ralph.email).
 *
 * Runs are not a stored entity of their own: the worker posts an `agent.end`
 * event to /api/events after each sweep, and this service reads those rows
 * back (payload keys per ralph/lib/api_client.py post_run_result). Rows are
 * matched on `actor=kipper` — stable across the 2026-08-12 source/job_name
 * rename — so pre-rename history and new rows read as one series.
 */
/** One message kipper declined to read, and the rule that caught it. */
export interface BlacklistSkip {
  gmailId: string | null;
  fromEmail: string | null;
  subject: string | null;
  /** 'sender' | 'subject' as written by kipper; kept as a string so a new rule
   *  kind shows up rather than being dropped. */
  rule: string | null;
  pattern: string | null;
  /** Whether it still reached LocalShout. The raw forward runs BEFORE the
   *  blacklist deliberately, so "kipper skipped it" is not "it went nowhere". */
  rawForwarded: boolean;
}

export interface PollRun {
  id: number;
  ts: string;
  /**
   * The sweep's own id, stamped on every email it discovered
   * (email_reports.poll_run_id). Null on runs before 2026-08-12, which is why
   * the drill-in link is conditional — those runs cannot be joined to their
   * mail by anything except a timestamp guess, and guessing is what this
   * replaced.
   */
  runId: string | null;
  startedAt: string | null;
  durationMs: number | null;
  model: string | null;
  /** Messages the sweep attempted. */
  total: number;
  ok: number;
  errors: number;
  linksFollowed: number;
  /** Work the sweep DECLINED. Null on runs predating decision recording —
   *  distinct from 0, which is the real claim "nothing was skipped". */
  linksSkipped: number | null;
  blacklistSkipped: number | null;
  /**
   * The individual skips, so "23 blacklisted" can be asked *which* 23 — the
   * whole point of recording them. Capped in the payload by kipper
   * (SKIP_DETAIL_CAP); `blacklistSkipsTruncated` carries the overflow so a
   * bounded list never reads as the complete story.
   */
  blacklistSkips: BlacklistSkip[];
  blacklistSkipsTruncated: number | null;
  /** Whether the LocalShout raw lane was configured on the host at all. A
   *  forwarded count of 0 means nothing when the lane was off. */
  rawLaneOn: boolean;
  rawForwarded: number | null;
  rawAttempted: number | null;
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

/** Both job identities: rows before the 2026-08-12 rename carry the old
 *  name and are the same series — never filter them out. */
const JOB_IDS = new Set(['kipper-email', 'ralph-email']);

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() !== '' ? v : null;
}

/** Null-safe: a run predating step-3 decision recording has no key here, and
 *  an empty array is the honest result — the caller distinguishes "none
 *  recorded" from "none skipped" via `blacklistSkipped === null`. */
function toSkips(v: unknown): BlacklistSkip[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((s): s is Record<string, unknown> => s !== null && typeof s === 'object')
    .map((s) => ({
      gmailId: str(s['gmail_id']),
      fromEmail: str(s['from_email']),
      subject: str(s['subject']),
      rule: str(s['rule']),
      pattern: str(s['pattern']),
      rawForwarded: s['raw_forwarded'] === true,
    }));
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
          `/api/events?actor=kipper&kind=agent.end&since=${encodeURIComponent(since)}&limit=1000`,
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
    if (!JOB_IDS.has(String(p['job_id']))) return null;
    return {
      id: e.id,
      ts: e.ts,
      runId: typeof p['run_id'] === 'string' && p['run_id'] !== '' ? p['run_id'] : null,
      startedAt: typeof p['started_at'] === 'string' ? p['started_at'] : null,
      durationMs: num(p['duration_ms']),
      model: typeof p['model'] === 'string' ? p['model'] : null,
      total: num(p['total']) ?? 0,
      ok: num(p['ok']) ?? 0,
      errors: num(p['errors']) ?? 0,
      linksFollowed: num(p['total_links']) ?? 0,
      // `?? null`, never `?? 0` — an older run genuinely did not record these,
      // and a zero would claim it declined nothing.
      linksSkipped: num(p['total_links_skipped']),
      blacklistSkipped: num(p['blacklist_skipped']),
      blacklistSkips: toSkips(p['blacklist_skips']),
      blacklistSkipsTruncated: num(p['blacklist_skips_truncated']),
      rawLaneOn: p['raw_lane_on'] === true,
      rawForwarded: num(p['raw_forwarded']),
      rawAttempted: num(p['raw_attempted']),
    };
  }

  /** One run by its stamped id, from whatever is already loaded. */
  findByRunId(runId: string): PollRun | null {
    return this.runs().find((r) => r.runId === runId) ?? null;
  }
}
