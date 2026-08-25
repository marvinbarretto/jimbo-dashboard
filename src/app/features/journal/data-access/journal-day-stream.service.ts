import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { DayStream } from '@domain/day-stream/day-stream';
import { environment } from '../../../../environments/environment';

export type DayStreamState =
  | { status: 'pending' }
  | { status: 'ready'; data: DayStream }
  | { status: 'failed' };

/**
 * One logical day from every registered source.
 *
 * Shared state rather than a fetch per component: Overview reads this twice
 * over (outcomes, and the support strips), and the payload is the same one.
 *
 * The registry lives server-side, which is what makes it worth reading here —
 * a signal added to jimbo-api appears in `aggregates` without a change on this
 * side. It also means `signals[]` is the honest record of what is live, quiet
 * or dead, and no consumer may collapse those into "no data".
 */
@Injectable({ providedIn: 'root' })
export class JournalDayStreamService {
  private readonly http = inject(HttpClient);

  private readonly _state = signal<DayStreamState>({ status: 'pending' });
  readonly state = this._state.asReadonly();

  readonly stream = computed(() => {
    const s = this._state();
    return s.status === 'ready' ? s.data : null;
  });

  private loaded: string | null = null;
  private inFlight: string | null = null;

  /**
   * Loads one logical day into the shared state.
   *
   * @param date - Local day key (YYYY-MM-DD)
   * @param force - Refetch a day already held; the live day's poll passes true
   */
  async load(date: string, force = false): Promise<void> {
    if (this.inFlight === date) return;
    if (!force && this.loaded === date) return;
    if (this.loaded !== date) this._state.set({ status: 'pending' });

    this.inFlight = date;
    try {
      const data = await firstValueFrom(
        this.http.get<DayStream>(
          `${environment.dashboardApiUrl}/api/journal/day-stream`,
          { params: { date } },
        ),
      );
      this._state.set({ status: 'ready', data });
      this.loaded = date;
    } catch {
      // A failed poll keeps what is on screen rather than blanking it.
      if (this.loaded !== date) this._state.set({ status: 'failed' });
    } finally {
      this.inFlight = null;
    }
  }
}
