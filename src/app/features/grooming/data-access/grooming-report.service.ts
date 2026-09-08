// The grooming pipeline as flow rather than state.
//
// The kanban answers "where does each note sit". It cannot answer "what has
// the pump actually been doing", because a board has no time axis: a note that
// passed intake an hour ago and one that passed a month ago occupy the same
// column. This service backs the page that answers the second question.
//
// Two reads, deliberately kept separate:
//
//   /api/pipeline/queue     — the funnel. Depth, eligibility and the FIFO head
//                             per stage. Cheap; the queue head only moves when
//                             a tick fires (every 30 min).
//   /api/dispatch/history   — the runs. That a pass happened, and how long it
//                             took.
//   /api/note-activity      — what the pass actually DID to the note: the
//                             grooming_status transition, the reassignment, and
//                             the model's own reading of the item.
//
// The third read is what makes a row legible. A dispatch row alone says
// "intake-quality: clear, passed", which restates the skill name and tells you
// nothing about what was read or what changed. note_activity carries
// from_value/to_value and an `intake_rationale` with the model's what_is_this /
// why_verdict / inferred_done — the difference between a log line and an
// explanation.
//
// "Running now" is NOT fetched here — FleetService already polls
// /api/dispatch/stats for the whole dashboard, and a second poller against the
// same endpoint would double the traffic to disagree with itself half the time.

import { HttpClient } from '@angular/common/http';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiDispatchesResponseSchema, type ApiDispatchEntry } from '@domain/dispatch/dispatch.api-schema';
import { SKILL_STAGE, STAGE_ORDER } from '@domain/pipeline';
import type { PipelineQueue, StageQueue } from '../../pipeline-control/data-access/pipeline-control.service';
import { environment } from '../../../../environments/environment';

/** What a pass changed on its note, joined from note_activity. Absent when no
 *  matching activity row was found — rendered as "no change recorded" rather
 *  than guessed at. */
export interface RunOutcome {
  fromStatus: string | null;
  toStatus: string | null;
  /** Short verdict with the skill prefix stripped: "clear", "P2 @ 0.65". */
  verdict: string | null;
  /** The model's reading of the note BEFORE it judged it — intake only. */
  readAs: string | null;
  whyVerdict: string | null;
  inferredDone: string | null;
  aiPriority: number | null;
  priorityConfidence: number | null;
  subtaskCount: number | null;
  reassignedFrom: string | null;
  reassignedTo: string | null;
}

/** One completed or failed grooming pass, flattened for display. */
export interface GroomingRun {
  id: string;
  stage: string;
  skill: string;
  noteId: string;
  seq: number | null;
  title: string | null;
  executor: string | null;
  model: string | null;
  status: string;
  /** What the pass decided — the column the kanban cannot show. */
  summary: string | null;
  error: string | null;
  retryCount: number;
  completedAt: string | null;
  /** Seconds between enqueue and pickup; null when either end is missing. */
  waitSeconds: number | null;
  /** Seconds the pass itself took. */
  runSeconds: number | null;
  /** Null when no note_activity row matched this dispatch. */
  outcome: RunOutcome | null;
}

/** A note_activity row. `context` is a JSON string on the wire. */
interface ActivityRow {
  note_id: string;
  ts: string;
  actor: string;
  action: string;
  from_value: string | null;
  to_value: string | null;
  reason: string | null;
  context: string | null;
}

const REFRESH_INTERVAL_MS = 30_000;
const NEXT_UP = 10;

/**
 * History page size. The pump admits at most `per_tick` per stage per tick, so
 * at today's settings (1 intake + 1 classify, 48 ticks/day) the daily ceiling
 * is ~96. 100 covers it — but only until a stage is switched back on, which is
 * exactly when a silently truncated table would mislead. `truncated` exists so
 * the page can say so instead.
 */
const HISTORY_LIMIT = 100;

/** note_activity page size. Both feeds are filtered to a single action, so a
 *  day's worth is tens of rows — 500 is headroom, not an expectation. */
const ACTIVITY_LIMIT = 500;

@Injectable({ providedIn: 'root' })
export class GroomingReportService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.dashboardApiUrl;

  private readonly _queue = signal<PipelineQueue | null>(null);
  private readonly _runs = signal<GroomingRun[]>([]);
  private readonly _truncated = signal(false);
  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _lastFetch = signal<string | null>(null);

  readonly runs = this._runs.asReadonly();
  readonly truncated = this._truncated.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly lastFetch = this._lastFetch.asReadonly();

  readonly ticksPerDay = computed(() => this._queue()?.ticks_per_day ?? null);
  readonly nextUpLimit = computed(() => this._queue()?.next_up_limit ?? NEXT_UP);

  /** Funnel stages in pipeline order, not response order. */
  readonly stages = computed<StageQueue[]>(() => {
    const byStage = new Map((this._queue()?.stages ?? []).map(s => [s.stage, s]));
    return STAGE_ORDER.map(s => byStage.get(s)).filter((s): s is StageQueue => s !== undefined);
  });

  /** Runs today, per stage — the count under each funnel row. */
  readonly runsByStage = computed(() => {
    const counts = new Map<string, number>();
    for (const r of this._runs()) counts.set(r.stage, (counts.get(r.stage) ?? 0) + 1);
    return counts;
  });

  readonly failedToday = computed(() => this._runs().filter(r => r.status === 'failed').length);

  private timerHandle: ReturnType<typeof setInterval> | null = null;
  private started = false;

  /** Call from a constructor — the DestroyRef teardown needs an injection
   *  context (same as FleetService). */
  start(): void {
    if (this.started) return;
    this.started = true;
    void this.refresh();
    this.timerHandle = setInterval(() => void this.refresh(), REFRESH_INTERVAL_MS);
    inject(DestroyRef).onDestroy(() => this.stop());
  }

  stop(): void {
    if (this.timerHandle !== null) clearInterval(this.timerHandle);
    this.timerHandle = null;
    this.started = false;
  }

  async refresh(): Promise<void> {
    this._loading.set(true);
    this._error.set(null);
    try {
      const since = startOfToday();
      const activity = (action: string) => firstValueFrom(this.http.get<{ items: ActivityRow[] }>(
        `${this.base}/api/note-activity`,
        { params: { action, since, limit: String(ACTIVITY_LIMIT) } },
      )).catch((): { items: ActivityRow[] } => ({ items: [] }));

      const [queue, history, transitions, reassignments] = await Promise.all([
        firstValueFrom(this.http.get<PipelineQueue>(
          `${this.base}/api/pipeline/queue`,
          { params: { next: String(NEXT_UP) } },
        )),
        firstValueFrom(this.http.get<unknown>(
          `${this.base}/api/dispatch/history`,
          {
            params: {
              flow: 'groom',
              // The API's own default. Running work is not here by design — it
              // comes from FleetService's `now[]`, so nothing appears twice.
              status: 'completed,failed',
              since,
              limit: String(HISTORY_LIMIT),
            },
          },
        )),
        // Losing either of these degrades a row to "no change recorded" rather
        // than failing the page — the timings and the funnel are still true.
        activity('grooming_status_changed'),
        activity('reassigned'),
      ]);

      this._queue.set(queue);

      const parsed = ApiDispatchesResponseSchema.safeParse(history);
      if (!parsed.success) {
        console.error('[grooming-report] /api/dispatch/history failed schema:', parsed.error.issues);
        throw new Error('dispatch history response did not match the expected shape');
      }
      this._runs.set(parsed.data.items.map(
        e => toRun(e, transitions.items ?? [], reassignments.items ?? []),
      ));
      this._truncated.set(parsed.data.items.length >= HISTORY_LIMIT);
      this._lastFetch.set(new Date().toISOString());
    } catch (err) {
      this._error.set(err instanceof Error ? err.message : 'fetch failed');
    } finally {
      this._loading.set(false);
    }
  }
}

/** Local midnight, not UTC — "today" on this page means Marvin's day, and a
 *  UTC boundary would drop the first hour of a BST morning. */
function startOfToday(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/**
 * Match a dispatch to the note_activity row it produced.
 *
 * NOT on timestamp alone. The two are written in the same transaction today and
 * every one of 38 rows matched to the millisecond — but that is one write path
 * observed on one day, and a note groomed twice by different stages would then
 * be a coin flip. The stable key is note + skill: activity `reason` is prefixed
 * with the skill slug ("intake-quality: clear"), so it identifies which pass
 * wrote the row. Timestamp only breaks ties among that pass's own retries.
 *
 * No match returns null, and the row says so. A guessed transition on a page
 * whose job is explaining what happened would be worse than a blank.
 */
function matchActivity(
  e: ApiDispatchEntry,
  rows: readonly ActivityRow[],
): ActivityRow | null {
  const slug = skillSlug(e.skill);
  if (!slug || !e.completed_at) return null;
  const at = Date.parse(e.completed_at);
  const candidates = rows.filter(
    r => r.note_id === e.task_id && (r.reason ?? '').startsWith(slug),
  );
  if (candidates.length === 0) return null;
  return candidates.reduce((best, r) =>
    Math.abs(Date.parse(r.ts) - at) < Math.abs(Date.parse(best.ts) - at) ? r : best,
  );
}

/** "dispatch/intake-quality" → "intake-quality", which is how note_activity
 *  prefixes its `reason`. */
function skillSlug(skill: string | null): string | null {
  return skill ? (skill.split('/').at(-1) ?? null) : null;
}

function parseContext(raw: string | null): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed as Record<string, unknown> : {};
  } catch {
    // A malformed context must cost one cell, not the row.
    return {};
  }
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function toOutcome(
  e: ApiDispatchEntry,
  transitions: readonly ActivityRow[],
  reassignments: readonly ActivityRow[],
): RunOutcome | null {
  const change = matchActivity(e, transitions);
  const move = matchActivity(e, reassignments);
  if (!change && !move) return null;

  const ctx = parseContext(change?.context ?? null);
  // Present on intake only; classify and decompose carry different shapes.
  const rationale = (typeof ctx['intake_rationale'] === 'object' && ctx['intake_rationale'] !== null)
    ? ctx['intake_rationale'] as Record<string, unknown>
    : {};

  const slug = skillSlug(e.skill);
  const reason = change?.reason ?? null;
  // Strip the skill prefix the reason repeats — the stage column already says
  // which pass this was.
  const verdict = reason && slug && reason.startsWith(`${slug}: `)
    ? reason.slice(slug.length + 2)
    : reason;

  return {
    fromStatus: change?.from_value ?? null,
    toStatus: change?.to_value ?? null,
    verdict,
    readAs: str(rationale['what_is_this']),
    whyVerdict: str(rationale['why_verdict']),
    inferredDone: str(rationale['inferred_done']),
    aiPriority: num(ctx['ai_priority']),
    priorityConfidence: num(ctx['priority_confidence']),
    subtaskCount: num(ctx['subtask_count']),
    reassignedFrom: move?.from_value ?? null,
    reassignedTo: move?.to_value ?? null,
  };
}

function toRun(
  e: ApiDispatchEntry,
  transitions: readonly ActivityRow[],
  reassignments: readonly ActivityRow[],
): GroomingRun {
  return {
    outcome: toOutcome(e, transitions, reassignments),
    id: String(e.id),
    stage: SKILL_STAGE[e.skill ?? ''] ?? 'other',
    skill: e.skill ?? '—',
    noteId: e.task_id,
    seq: e.task_seq == null ? null : Number(e.task_seq),
    title: e.task_title ?? null,
    executor: e.executor,
    model: e.completed_model ?? null,
    status: e.status,
    summary: e.result_summary,
    error: e.error_message,
    retryCount: e.retry_count,
    completedAt: e.completed_at,
    waitSeconds: elapsed(e.proposed_at, e.started_at),
    runSeconds: elapsed(e.started_at, e.completed_at),
  };
}

function elapsed(from: string | null, to: string | null): number | null {
  if (!from || !to) return null;
  const ms = Date.parse(to) - Date.parse(from);
  return Number.isFinite(ms) && ms >= 0 ? Math.round(ms / 1000) : null;
}
