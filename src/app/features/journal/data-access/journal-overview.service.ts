import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { JournalOverview, OverviewPeriod } from '@domain/journal/overview';
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

  /** The window currently held, so repeat loads for the same one are cheap. */
  private loaded: string | null = null;
  private inFlight: string | null = null;

  /**
   * Loads one day's comparisons into the shared state.
   *
   * @param date - Any local day inside the period (YYYY-MM-DD)
   * @param period - Horizon; the server resolves the containing period
   * @param force - Refetch even when this window is already held; the live
   *   period's poll passes true, a navigation does not need to
   */
  async load(date: string, period: OverviewPeriod = 'day', force = false): Promise<void> {
    const key = `${period}:${date}`;
    if (this.inFlight === key) return;
    if (!force && this.loaded === key) return;

    // Only blank the panel when moving to a different window. A poll that
    // cleared it would flicker the whole rail once a minute for no new
    // information.
    if (this.loaded !== key) this._state.set({ status: 'pending' });

    this.inFlight = key;
    try {
      const data = await firstValueFrom(
        this.http.get<JournalOverview>(
          `${environment.dashboardApiUrl}/api/journal/overview`,
          { params: { date, period } },
        ),
      );
      this._state.set({ status: 'ready', data });
      this.loaded = key;
    } catch {
      // A failed poll keeps the figures already on screen: stale numbers with
      // a known timestamp beat an empty panel.
      if (this.loaded !== key) this._state.set({ status: 'failed' });
    } finally {
      this.inFlight = null;
    }
  }
}
