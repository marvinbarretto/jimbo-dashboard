// Reads GET /api/costs/summary?days=7 — the trajectory the fleet board's 5h
// burn figure had nothing to be judged against.
//
// $7.81 trailing 5h is meaningless on its own: it is framed as a pressure
// proxy, and a proxy with no baseline cannot indicate pressure. A today-total
// and a 7-day line make it readable.
//
// Same table as the fleet's burn_5h rollup, so the comparison is like for like
// — and it carries the same caveat, which the page must keep saying: worker
// turns run flat-rate on the Max plan, so the dollar figure is notional, and
// unpriced rows are excluded rather than counted as free.

import { HttpClient } from '@angular/common/http';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiCostSummarySchema, type ApiCostSummary } from '@domain/costs';
import { environment } from '../../../../environments/environment';

const REFRESH_INTERVAL_MS = 5 * 60_000;
const WINDOW_DAYS = 7;

@Injectable({ providedIn: 'root' })
export class CostsService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.dashboardApiUrl}/api/costs/summary?days=${WINDOW_DAYS}`;

  private readonly _summary = signal<ApiCostSummary | null>(null);
  private readonly _lastError = signal<string | null>(null);

  readonly summary = this._summary.asReadonly();
  readonly lastError = this._lastError.asReadonly();
  readonly windowDays = WINDOW_DAYS;

  readonly byDay = computed(() => this._summary()?.by_day ?? []);
  readonly monthlyCost = computed(() => this._summary()?.monthly_cost ?? null);
  readonly unpriced = computed(() => this._summary()?.unpriced ?? 0);

  /**
   * Today's total, matched on the API's own logical day label.
   *
   * Not derived from a local `new Date()`: the API buckets by a logical day
   * that starts at a cutover hour in Europe/London, not at local midnight, so
   * computing the key here would silently disagree with the server for part of
   * every day. The last bucket the API sent is today's by construction.
   */
  readonly today = computed(() => {
    const days = this.byDay();
    return days.length > 0 ? days[days.length - 1] : null;
  });

  /** Mean daily spend over the window, excluding today's partial day. */
  readonly dailyMean = computed(() => {
    const complete = this.byDay().slice(0, -1).filter(d => d.total !== null);
    if (complete.length === 0) return null;
    return complete.reduce((sum, d) => sum + (d.total ?? 0), 0) / complete.length;
  });

  /** Largest complete day in the window — the scale a sparkline is drawn to. */
  readonly peakDay = computed(() =>
    this.byDay().reduce((max, d) => Math.max(max, d.total ?? 0), 0));

  private timerHandle: ReturnType<typeof setInterval> | null = null;
  private started = false;

  start(): void {
    if (this.started) return;
    this.started = true;
    void this.refresh();
    this.timerHandle = setInterval(() => void this.refresh(), REFRESH_INTERVAL_MS);
    inject(DestroyRef).onDestroy(() => this.stop());
  }

  stop(): void {
    if (this.timerHandle !== null) {
      clearInterval(this.timerHandle);
      this.timerHandle = null;
    }
    this.started = false;
  }

  async refresh(): Promise<void> {
    this._lastError.set(null);
    try {
      const raw = await firstValueFrom(this.http.get<unknown>(this.url));
      const result = ApiCostSummarySchema.safeParse(raw);
      if (!result.success) {
        console.error('[costs] /api/costs/summary response failed schema:', result.error.issues);
        this._lastError.set('API response did not match expected shape');
        return;
      }
      this._summary.set(result.data);
    } catch (err) {
      this._lastError.set(err instanceof Error ? err.message : 'fetch failed');
    }
  }
}
