// Reads the watch queue produced by url-triage — videos and long reads it kept
// from Marvin's saved links, sized at his real playback speed.
//
// Deliberately read-only and unplaced. url-triage's first release booked these
// straight into the calendar and produced an evening timetable nobody would
// follow; deciding *when* needs sight of gym/family/work, which is a separate
// job's problem. This widget just shows the list.
import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface WatchQueueItem {
  readonly id: string;
  readonly seq: number | null;
  readonly title: string;
  readonly url: string | null;
  /** Raw runtime as published. */
  readonly minutes: number | null;
  /** Runtime at Marvin's 1.5x playback — the real claim on his time. */
  readonly watchMinutes: number | null;
  /** Effort in 25-minute planner blocks. */
  readonly blocks: number | null;
  readonly reason: string;
  readonly priority: number | null;
  readonly createdAt: string | null;
}

interface WatchQueueResponse {
  readonly count: number;
  readonly totalMinutes: number;
  readonly totalWatchMinutes: number;
  readonly items: readonly WatchQueueItem[];
}

@Injectable({ providedIn: 'root' })
export class WatchQueueService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.dashboardApiUrl;

  private readonly _items = signal<readonly WatchQueueItem[]>([]);
  private readonly _totalMinutes = signal(0);
  private readonly _totalWatchMinutes = signal(0);
  private readonly _loading = signal(true);
  private readonly _error = signal(false);

  readonly items = this._items.asReadonly();
  readonly isLoading = this._loading.asReadonly();
  readonly hasError = this._error.asReadonly();
  readonly totalMinutes = this._totalMinutes.asReadonly();
  readonly totalWatchMinutes = this._totalWatchMinutes.asReadonly();

  readonly count = computed(() => this._items().length);

  /** Shortest first — the most placeable items, for "I've got 20 minutes". */
  readonly byShortest = computed(() =>
    [...this._items()].sort((a, b) => (a.watchMinutes ?? 0) - (b.watchMinutes ?? 0)),
  );

  async load(): Promise<void> {
    this._loading.set(true);
    this._error.set(false);
    try {
      const res = await firstValueFrom(
        this.http.get<WatchQueueResponse>(`${this.base}/api/google-tasks/watch-queue`),
      );
      this._items.set(res.items ?? []);
      this._totalMinutes.set(res.totalMinutes ?? 0);
      this._totalWatchMinutes.set(res.totalWatchMinutes ?? 0);
    } catch {
      // Non-fatal: the planner is useful without this panel, so a failed load
      // shows an inline note rather than breaking the page.
      this._error.set(true);
      this._items.set([]);
    } finally {
      this._loading.set(false);
    }
  }
}
