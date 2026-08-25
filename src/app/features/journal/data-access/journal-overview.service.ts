import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { JournalOverview } from '@domain/journal/overview';
import { environment } from '../../../../environments/environment';

/** The three states read differently on screen, so they are named, not inferred. */
export type OverviewState =
  | { status: 'pending' }
  | { status: 'ready'; data: JournalOverview }
  | { status: 'failed' };

/**
 * The day's metrics with their comparisons already made.
 *
 * Thin by design — every rule that could be argued about (which baseline, how
 * a live day is truncated, when a sample is disqualified) lives in jimbo-api
 * so this page, a briefing and a Telegram digest quote the same number.
 *
 * Holds one day at a time rather than a per-date cache: the page shows one
 * day, several sections read the same payload, and a keyed store would tempt
 * per-caller `computed()` accessors that allocate on every read.
 */
@Injectable({ providedIn: 'root' })
export class JournalOverviewService {
  private readonly http = inject(HttpClient);

  private readonly _state = signal<OverviewState>({ status: 'pending' });
  readonly state = this._state.asReadonly();

  readonly overview = computed(() => {
    const s = this._state();
    return s.status === 'ready' ? s.data : null;
  });

  /** The date currently held, so repeat loads for the same day are cheap. */
  private loaded: string | null = null;
  private inFlight: string | null = null;

  /**
   * Loads one day's comparisons into the shared state.
   *
   * @param date - Local day key (YYYY-MM-DD)
   * @param force - Refetch even when this date is already held; the live day's
   *   poll passes true, a date change does not need to
   */
  async load(date: string, force = false): Promise<void> {
    if (this.inFlight === date) return;
    if (!force && this.loaded === date) return;

    // Only blank the panel when moving to a different day. A poll that cleared
    // it would flicker the whole rail once a minute for no new information.
    if (this.loaded !== date) this._state.set({ status: 'pending' });

    this.inFlight = date;
    try {
      const data = await firstValueFrom(
        this.http.get<JournalOverview>(
          `${environment.dashboardApiUrl}/api/journal/overview`,
          { params: { date } },
        ),
      );
      this._state.set({ status: 'ready', data });
      this.loaded = date;
    } catch {
      // A failed poll keeps the figures already on screen: stale numbers with
      // a known timestamp beat an empty panel.
      if (this.loaded !== date) this._state.set({ status: 'failed' });
    } finally {
      this.inFlight = null;
    }
  }
}
