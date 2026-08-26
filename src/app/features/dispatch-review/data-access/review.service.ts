// Reads the "awaiting review" pile from jimbo-api and clears it via approve /
// send-back. This is the human output gate of the commission flow: completed
// work (PR or doc) lands here and never reaches `done` until Marvin approves.
//
//   GET  /api/dispatch/awaiting-review   -> { items, total }
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
  completed_at: string | null;
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
  completedAt: string | null;
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
    completedAt: r.completed_at,
  };
}

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly base = `${environment.dashboardApiUrl}/api/dispatch`;

  private readonly _items = signal<ReviewItem[]>([]);
  private readonly _loading = signal(true);

  readonly items = this._items.asReadonly();
  readonly isLoading = this._loading.asReadonly();

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
  }

  /** Approve → note marked done. Optimistically drops the card. */
  approve(item: ReviewItem): void {
    withOptimisticRemove(this._items, this.toast, {
      prior: item,
      request: this.http.post(`${this.base}/review/approve`, { note_id: item.noteId }),
      errorMessage: 'Approve failed — card restored.',
    });
  }

  /** Send back → note reset to needs_rework with a reason. Optimistically drops the card. */
  sendBack(item: ReviewItem, reason: string): void {
    withOptimisticRemove(this._items, this.toast, {
      prior: item,
      request: this.http.post(`${this.base}/review/send-back`, { note_id: item.noteId, reason }),
      errorMessage: 'Send-back failed — card restored.',
    });
  }
}
