// Reads the "awaiting review" pile from jimbo-api and clears it via approve /
// send-back. This is the human output gate of the commission flow: completed
// work (PR or doc) lands here and never reaches `done` until Marvin approves.
//
//   GET  /api/dispatch/awaiting-review   -> { items, total }
//   GET  /api/dispatch/review/pressure   -> the gauge (see ReviewPressure)
//   POST /api/dispatch/review/approve    -> { note_id }   (→ note done)
//   POST /api/dispatch/review/send-back  -> { note_id, reason }  (→ needs_rework)

import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { ToastService } from '@shared/components/toast/toast.service';
import { withOptimisticRemove } from '@shared/data-access/with-optimistic';

/** Server row shape (snake_case wire format). */
interface ApiReviewItem {
  note_id: string;
  seq: string | null;
  title: string | null;
  assigned_to: string | null;
  acceptance_criteria: string | null;
  dispatch_id: string;
  skill: string | null;
  result_summary: string | null;
  pr_url: string | null;
  pr_state: string | null;
  pr_checks: string | null;
  completed_at: string | null;
  criteria: Array<{ criterion: string; verdict: string; note: string }> | null;
  artifact_url: string | null;
  artifact_source: 'pr' | 'summary' | 'branch' | 'commit' | null;
  artifact_ref: string | null;
  project: { id: string; display_name: string | null; color_token: string | null;
             intent: string | null; success_criteria: string | null } | null;
  epic: { seq: string | null; title: string | null } | null;
  verification: {
    kind: string;
    routing: string;
    reason: string;
    artifact_reachable: boolean;
    verified_at: string | null;
  } | null;
}

/**
 * Wire shape of the review gauge.
 *
 * Unreviewed items count against pipeline.commission_concurrency_cap, so this
 * queue throttles the whole commission lane: at slots_free = 0 nothing new is
 * commissioned however healthy grooming looks upstream. Measured 2026-08-27 the
 * lane had been sitting at 9 of 10 with no surface anywhere, which read as
 * "execution stopped" rather than "the brake is on".
 */
interface ApiReviewPressure {
  awaiting: number;
  in_flight: number;
  cap: number;
  slots_free: number;
  oldest_wait_days: number | null;
  blocked: boolean;
  blocked_on_ci: number;
  held_standing: number;
  held: Array<{
    seq: string | null;
    note_id: string;
    dispatch_id: string;
    title: string | null;
    pr_url: string | null;
    reason: 'red_ci' | 'standing';
  }>;
}

export interface ReviewPressure {
  awaiting: number;
  inFlight: number;
  cap: number;
  slotsFree: number;
  oldestWaitDays: number | null;
  /** No new work can be commissioned until something here is cleared. */
  blocked: boolean;
  /** Completed commissions held out of the queue because their PR is red. */
  blockedOnCi: number;
  /** Standing anchors — recurring hooks that cannot be approved away. */
  heldStanding: number;
  /** The held rows themselves, so the counts above are reachable. */
  held: readonly HeldItem[];
}

/** Finished work deliberately kept off the review list, and why. */
export interface HeldItem {
  seq: string | null;
  noteId: string;
  /** What /api/dispatch/{id}/retry needs to re-run this. */
  dispatchId: string;
  title: string | null;
  prUrl: string | null;
  reason: 'red_ci' | 'standing';
}

/** Dashboard row. `id` (= note_id) is the stable key for optimistic removal. */
export interface ReviewItem {
  id: string;
  noteId: string;
  seq: string | null;
  title: string | null;
  assignedTo: string | null;
  /**
   * What the work was commissioned to achieve. Rendered beside the agent's own
   * summary so approving is a check against the brief, not a rubber stamp —
   * this gate paces the whole commission lane.
   */
  acceptanceCriteria: string | null;
  dispatchId: string;
  skill: string | null;
  resultSummary: string | null;
  prUrl: string | null;
  prState: string | null;
  /** 'passing' | 'pending' | null. Never 'failing' — red work never reaches here. */
  prChecks: string | null;
  completedAt: string | null;
  /**
   * Per-criterion state from the verifier, when it has run. Null before it has.
   * Rendered as a checklist: what it settled is marked off, what it could not
   * is left for a human — which is most of them, and correctly so.
   */
  criteria: ReviewCriterion[] | null;
  /**
   * The thing to open before deciding. Null means there is nothing to open and
   * approving would be trusting the agent's account of itself — 5 of the 9
   * items in the queue on 2026-08-28 were in that state.
   */
  artifactUrl: string | null;
  /**
   * 'pr' is the deliverable itself. 'summary' is a link scraped from the
   * agent's prose and may be a source it read rather than a thing it made, so
   * the card must label it as found-in-summary, never as verified.
   */
  artifactSource: 'pr' | 'summary' | 'branch' | 'commit' | null;
  /**
   * A deliverable the agent named that is not openable — a branch or a commit.
   * Shown as a labelled reference, never as a link: the repo is usually
   * unknown, so a synthesised URL would 404 on exactly the cards that already
   * ask for the most trust.
   */
  artifactRef: string | null;
  /**
   * What the verifier concluded overall, or null when it never ran.
   *
   * The null is load-bearing. "Verified, and every criterion needed a human"
   * and "never verified" both render as blank tickboxes, and they are very
   * different claims about the work.
   */
  verification: ReviewVerification | null;
  /**
   * What this work is FOR, as the project already states it. Null when the
   * item belongs to no project — which is a routing problem, not a review.
   */
  project: ReviewProject | null;
  /** The parent this sits under, so a subtask reads as part of something. */
  epic: { seq: string | null; title: string | null } | null;
}

export interface ReviewProject {
  id: string;
  displayName: string | null;
  colorToken: string | null;
  intent: string | null;
  successCriteria: string | null;
}

export interface ReviewVerification {
  /** 'shipped' | 'report' | 'already_satisfied' | 'declined' | … */
  kind: string;
  /** 'marvin' | 'question' | 'auto_stamp' — where the verifier would send it. */
  routing: string;
  reason: string;
  artifactReachable: boolean;
  verifiedAt: string | null;
}

export interface ReviewCriterion {
  criterion: string;
  /**
   * How this criterion could be settled at all: 'subjective', 'measurable',
   * 'code_present', 'artifact_exists'.
   *
   * The difference that matters on the card. 74 of 92 recorded criteria are
   * subjective — no mechanical check exists and none ever will, so an empty
   * box against them is correct and final. A `code_present` one left
   * unverifiable is the opposite: the machine tried and could not reach it.
   * Optional because rows written before the field existed lack it.
   */
  kind?: string;
  /** 'met' | 'not_met' | 'unverifiable'. */
  verdict: string;
  note: string;
}

function toReviewItem(r: ApiReviewItem): ReviewItem {
  return {
    id: r.note_id,
    noteId: r.note_id,
    seq: r.seq,
    title: r.title,
    assignedTo: r.assigned_to,
    acceptanceCriteria: r.acceptance_criteria,
    dispatchId: r.dispatch_id,
    skill: r.skill,
    resultSummary: r.result_summary,
    prUrl: r.pr_url,
    prState: r.pr_state,
    prChecks: r.pr_checks,
    completedAt: r.completed_at,
    criteria: r.criteria ?? null,
    artifactUrl: r.artifact_url ?? null,
    artifactSource: r.artifact_source ?? null,
    artifactRef: r.artifact_ref ?? null,
    project: r.project
      ? {
          id: r.project.id,
          displayName: r.project.display_name,
          colorToken: r.project.color_token,
          intent: r.project.intent,
          successCriteria: r.project.success_criteria,
        }
      : null,
    epic: r.epic ?? null,
    verification: r.verification
      ? {
          kind: r.verification.kind,
          routing: r.verification.routing,
          reason: r.verification.reason,
          artifactReachable: r.verification.artifact_reachable,
          verifiedAt: r.verification.verified_at,
        }
      : null,
  };
}

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly base = `${environment.dashboardApiUrl}/api/dispatch`;

  private readonly _items = signal<ReviewItem[]>([]);
  private readonly _loading = signal(true);
  private readonly _pressure = signal<ReviewPressure | null>(null);

  readonly items = this._items.asReadonly();
  readonly isLoading = this._loading.asReadonly();
  readonly pressure = this._pressure.asReadonly();

  constructor() {
    this.load();
  }

  load(): void {
    this._loading.set(true);
    this.http
      .get<{ items: ApiReviewItem[]; total: number }>(`${this.base}/awaiting-review`)
      .subscribe({
        next: (res) => {
          this._items.set((res.items ?? []).map(toReviewItem));
          this._loading.set(false);
        },
        error: () => {
          this._loading.set(false);
          this.toast.error('Failed to load the review queue.');
        },
      });
    this.loadPressure();
  }

  /**
   * Loaded separately from the list because it counts things the list cannot
   * show: running dispatches, and work held back by red CI.
   *
   * A failure here leaves the gauge null rather than showing zeros — an
   * unmeasured queue must not read as an empty one.
   */
  private loadPressure(): void {
    this.http.get<ApiReviewPressure>(`${this.base}/review/pressure`).subscribe({
      next: (p) => this._pressure.set({
        awaiting: p.awaiting,
        inFlight: p.in_flight,
        cap: p.cap,
        slotsFree: p.slots_free,
        oldestWaitDays: p.oldest_wait_days,
        blocked: p.blocked,
        blockedOnCi: p.blocked_on_ci,
        // Tolerate the pre-deploy shape: an older API returns neither field,
        // and a gauge that throws is worse than one that under-reports.
        heldStanding: p.held_standing ?? 0,
        held: (p.held ?? []).map(h => ({
          seq: h.seq, noteId: h.note_id, dispatchId: h.dispatch_id, title: h.title,
          prUrl: h.pr_url, reason: h.reason,
        })),
      }),
      error: () => this._pressure.set(null),
    });
  }

  /**
   * Re-run a dispatch whose PR went red.
   *
   * The only useful action on a held item: it is finished, it is not
   * reviewable, and approving or sending it back would both be wrong. The
   * server owns the state flip; we reload the gauge so the row leaves the held
   * list once it is queued again.
   */
  retryHeld(held: HeldItem): void {
    this.http
      .post(`${this.base}/${encodeURIComponent(held.dispatchId)}/retry`, {})
      .subscribe({
        next: () => {
          this.toast.success(`#${held.seq ?? held.noteId} queued to run again`);
          this.load();
        },
        error: () => this.toast.error('Could not queue that dispatch for a retry.'),
      });
  }

  /** Approve → note marked done. Optimistically drops the card. */
  approve(item: ReviewItem): void {
    withOptimisticRemove(this._items, this.toast, {
      prior: item,
      request: this.http.post(`${this.base}/review/approve`, { note_id: item.noteId }),
      errorMessage: 'Approve failed — card restored.',
      // The card vanishing is ambiguous on its own — it looks the same as a
      // filter changing. Name what happened and to which item, and say the slot
      // is back, because freeing capacity is the point of clearing this queue.
      onSuccess: () => {
        this.toast.success(`${this.label(item)} approved and marked done — one commission slot freed.`);
        this.loadPressure();
      },
    });
  }

  /** Send back → note reset to needs_rework with a reason. Optimistically drops the card. */
  sendBack(item: ReviewItem, reason: string): void {
    withOptimisticRemove(this._items, this.toast, {
      prior: item,
      request: this.http.post(`${this.base}/review/send-back`, { note_id: item.noteId, reason }),
      errorMessage: 'Send-back failed — card restored.',
      onSuccess: () => {
        this.toast.info(`${this.label(item)} sent back for rework.`);
        this.loadPressure();
      },
    });
  }

  /** "#2603" when there is a seq, else the title — never an opaque note id. */
  private label(item: ReviewItem): string {
    return item.seq ? `#${item.seq}` : (item.title ?? 'Item');
  }
}
