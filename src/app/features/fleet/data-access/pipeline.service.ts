// Reads GET /api/state/pipeline — intake, output, WIP and conversion per lane,
// each carrying its declared gate state.
//
// The endpoint has returned all of this since it shipped and none of it was on
// any page. That is how `recon` took 164 items over 12 weeks, shipped nothing
// with its valves fully open, and nobody noticed: the API had been saying so,
// in a `warnings` array no consumer read.
//
// Polled far more slowly than the fleet stats — these are weekly buckets, so a
// 30s poll would be re-fetching a number that changes on Mondays.

import { HttpClient } from '@angular/common/http';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiPipelineReportSchema, type ApiPipelineReport } from '@domain/pipeline';
import { environment } from '../../../../environments/environment';

const REFRESH_INTERVAL_MS = 5 * 60_000;

@Injectable({ providedIn: 'root' })
export class PipelineService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.dashboardApiUrl}/api/state/pipeline`;

  private readonly _report = signal<ApiPipelineReport | null>(null);
  private readonly _loading = signal(false);
  private readonly _lastError = signal<string | null>(null);

  readonly report = this._report.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly lastError = this._lastError.asReadonly();

  readonly lanes = computed(() => this._report()?.lanes ?? []);
  readonly warnings = computed(() => this._report()?.warnings ?? []);
  readonly windowWeeks = computed(() => this._report()?.window_weeks ?? null);
  readonly generatedAt = computed(() => this._report()?.generated_at ?? null);

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
    this._loading.set(true);
    this._lastError.set(null);
    try {
      const raw = await firstValueFrom(this.http.get<unknown>(this.url));
      const result = ApiPipelineReportSchema.safeParse(raw);
      if (!result.success) {
        console.error('[pipeline] /api/state/pipeline response failed schema:', result.error.issues);
        // Deliberately not a toast: this is one strip on a page whose other
        // half is the thing you came for. Blank the strip, say why in the
        // console, leave the fleet readable.
        this._lastError.set('API response did not match expected shape');
        return;
      }
      this._report.set(result.data);
    } catch (err) {
      this._lastError.set(err instanceof Error ? err.message : 'fetch failed');
    } finally {
      this._loading.set(false);
    }
  }
}
