// Loads the briefing archive and persists Marvin's quality ratings.
//
// Single owner of the rate mutation so the archive page, the journal day-page
// section, and the briefing-detail page all write through one place and stay in
// sync. List state lives here as a signal store; rating updates patch the row
// in place from the API's returned record.

import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type { BriefingAnalysis, BriefingRating } from './briefing.types';
import { ratingScore } from './briefing.types';

// Archive is "all" briefings. At 2/day the cap below buys years; the page shows
// the actual count so a future truncation reads as "showing N", not "complete".
const ARCHIVE_LIMIT = 1000;

@Injectable({ providedIn: 'root' })
export class BriefingsService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.dashboardApiUrl;

  private readonly _briefings = signal<BriefingAnalysis[]>([]);
  private readonly _loading = signal(true);
  private readonly _error = signal<string | null>(null);
  private readonly _saving = signal<ReadonlySet<number>>(new Set());

  readonly briefings = this._briefings.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  // Quality signal across rated briefings: count, average score (1-4), and the
  // share rated Good-or-better. Drives the archive header summary.
  readonly quality = computed(() => {
    const rated = this._briefings().filter(b => b.rating);
    if (rated.length === 0) return { rated: 0, avg: null, goodOrBetterPct: null } as const;
    const scores = rated.map(b => ratingScore(b.rating)!);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const goodOrBetter = rated.filter(b => b.rating === 'good' || b.rating === 'great').length;
    return {
      rated: rated.length,
      avg,
      goodOrBetterPct: Math.round((goodOrBetter / rated.length) * 100),
    } as const;
  });

  // No eager load: this service is providedIn:'root' but briefing-detail and the
  // journal section inject it only for rate()/fetchForDate(). The archive page
  // calls load() itself so those surfaces don't pull the full archive.
  async load(): Promise<void> {
    this._loading.set(true);
    this._error.set(null);
    try {
      const rows = await firstValueFrom(
        this.http.get<BriefingAnalysis[]>(`${this.base}/api/briefing/history?limit=${ARCHIVE_LIMIT}`),
      );
      this._briefings.set(rows ?? []);
    } catch (e) {
      this._error.set(messageOf(e));
    } finally {
      this._loading.set(false);
    }
  }

  // Date-scoped fetch that does NOT touch the archive store — used by the
  // journal day-page section, which manages its own per-day list. `since`/`until`
  // are ISO instants (the journal passes local-midnight boundaries so a briefing
  // lands on the right calendar day).
  async fetchForDate(since: string, until: string): Promise<BriefingAnalysis[]> {
    const qs = `since=${encodeURIComponent(since)}&until=${encodeURIComponent(until)}&limit=10`;
    const rows = await firstValueFrom(
      this.http.get<BriefingAnalysis[]>(`${this.base}/api/briefing/history?${qs}`),
    );
    return rows ?? [];
  }

  isSaving(id: number): boolean {
    return this._saving().has(id);
  }

  // Persist a rating (+ optional note). Returns the updated record so callers
  // outside the store (journal section) can reflect it locally too.
  async rate(id: number, rating: BriefingRating, note: string | null): Promise<BriefingAnalysis | null> {
    this._saving.update(s => new Set(s).add(id));
    try {
      const updated = await firstValueFrom(
        this.http.put<BriefingAnalysis>(`${this.base}/api/briefing/${id}/rate`, {
          rating,
          note: note ?? undefined,
        }),
      );
      this._briefings.update(list => list.map(b => (b.id === id ? updated : b)));
      return updated;
    } catch (e) {
      this._error.set(messageOf(e));
      return null;
    } finally {
      this._saving.update(s => {
        const next = new Set(s);
        next.delete(id);
        return next;
      });
    }
  }
}

function messageOf(e: unknown): string {
  if (e && typeof e === 'object' && 'error' in e) {
    const inner = (e as { error?: { error?: { message?: string } } }).error?.error?.message;
    if (inner) return inner;
  }
  if (e instanceof Error) return e.message;
  return 'Failed to load briefings';
}
