import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import type { AwaitingMe, Handback } from '@domain/awaiting';
import type { ActorId, ThreadMessageId, VaultItemId } from '@domain/ids';
import { environment } from '../../../../environments/environment';
import { ToastService } from '@shared/components/toast/toast.service';
import { isSeedMode } from '@shared/seed-mode';

/**
 * How far back the strip looks by default.
 *
 * Every live handback is real — an agent handed it over and nobody ever
 * answered — but the all-time set is ~1,000 rows, which is a backlog, not a
 * queue. A week is roughly the horizon on which an unanswered handback is still
 * a live question rather than an abandoned one. The older count is never
 * hidden: `counts.older` ships alongside, and the strip states it.
 */
const DEFAULT_WINDOW_DAYS = 7;

const EMPTY: AwaitingMe = {
  handbacks: [],
  questions: [],
  counts: { handbacks: 0, handbacks_total: 0, questions: 0, older: 0 },
};

@Injectable({ providedIn: 'root' })
export class AwaitingService {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly url = `${environment.dashboardApiUrl}/api/note-activity/awaiting-me`;

  private readonly _data = signal<AwaitingMe>(EMPTY);
  private readonly _windowDays = signal<number | null>(DEFAULT_WINDOW_DAYS);
  private readonly _loaded = signal(false);
  readonly loading = signal(false);

  /** null = no window, show everything. */
  readonly windowDays = this._windowDays.asReadonly();
  readonly counts = computed(() => this._data().counts);
  readonly handbacks = computed(() => this._data().handbacks);
  readonly loaded = this._loaded.asReadonly();

  /**
   * Questions minus the ones answered in this session. Mirrors QuestionsService
   * so an answer clears the row without waiting for a refetch — the acceptance
   * criterion is "removes it from the strip without a page reload".
   */
  readonly questions = computed(() => this._data().questions.filter(q => q.answered_by === null));

  /** Note ids with an agent waiting on them — lets a lane card read differently. */
  readonly awaitingNoteIds = computed(() => {
    const ids = new Set<string>();
    for (const h of this._data().handbacks) ids.add(h.note_id as string);
    for (const q of this.questions()) ids.add(q.vault_item_id as string);
    return ids;
  });

  load(actor?: ActorId): void {
    if (isSeedMode()) {
      // No seed fixture for handbacks: they are derived from note_activity
      // history, which SEED does not carry. An empty strip is the honest
      // rendering — better than inventing a count.
      this._data.set(EMPTY);
      this._loaded.set(true);
      return;
    }
    this.loading.set(true);
    let params = new HttpParams().set('limit', 50);
    if (actor) params = params.set('actor', actor);
    const days = this._windowDays();
    if (days !== null) {
      params = params.set('since', new Date(Date.now() - days * 86_400_000).toISOString());
    }
    this.http.get<AwaitingMe>(this.url, { params }).subscribe({
      next: data => { this._data.set(data); this._loaded.set(true); this.loading.set(false); },
      error: () => { this.toast.error('Failed to load what you are blocking'); this.loading.set(false); },
    });
  }

  /** Widen or narrow the window, then refetch. */
  setWindowDays(days: number | null, actor?: ActorId): void {
    this._windowDays.set(days);
    this.load(actor);
  }

  /** Optimistic: drop an answered question without a round-trip. */
  markAnswered(questionId: ThreadMessageId, answerId: ThreadMessageId): void {
    this._data.update(d => ({
      ...d,
      questions: d.questions.map(q =>
        q.id === questionId ? ({ ...q, answered_by: answerId } as unknown as typeof q) : q,
      ),
      counts: { ...d.counts, questions: Math.max(0, d.counts.questions - 1) },
    }));
  }

  /**
   * Optimistic: drop a handback the operator has dealt with. The server drops it
   * on the next load anyway (the note stops being assigned to them, or stops
   * being open) — this just avoids the row lingering until then.
   */
  dismiss(noteId: VaultItemId): void {
    this._data.update(d => {
      const kept = d.handbacks.filter((h: Handback) => h.note_id !== noteId);
      const removed = d.handbacks.length - kept.length;
      return {
        ...d,
        handbacks: kept,
        counts: {
          ...d.counts,
          handbacks: Math.max(0, d.counts.handbacks - removed),
          handbacks_total: Math.max(0, d.counts.handbacks_total - removed),
        },
      };
    });
  }
}
