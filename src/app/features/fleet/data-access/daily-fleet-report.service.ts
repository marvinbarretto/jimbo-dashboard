// Fetches GET /api/fleet-report/daily (jimbo-api) for a given logical day.
// Unlike FleetService (30s live poll), a finished day's report doesn't
// change — fetch-on-date-change only, driven by the daily-report page's
// date pager. Same Zod-at-the-boundary validation as fleet.service.ts.

import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiDailyFleetReportSchema, type ApiDailyFleetReport } from '@domain/dispatch';
import { environment } from '../../../../environments/environment';
import { ToastService } from '@shared/components/toast/toast.service';

@Injectable({ providedIn: 'root' })
export class DailyFleetReportService {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly url = `${environment.dashboardApiUrl}/api/fleet-report/daily`;

  private readonly _report = signal<ApiDailyFleetReport | null>(null);
  private readonly _loading = signal(false);
  private readonly _lastError = signal<string | null>(null);

  readonly report = this._report.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly lastError = this._lastError.asReadonly();

  readonly reportDate = computed(() => this._report()?.report_date ?? null);
  readonly actors = computed(() => this._report()?.actors ?? []);

  // `date` omitted → server defaults to yesterday's logical day. Pass an
  // explicit YYYY-MM-DD to page to a different day.
  async load(date?: string): Promise<void> {
    this._loading.set(true);
    this._lastError.set(null);
    try {
      const raw = await firstValueFrom(
        this.http.get<unknown>(this.url, { params: date ? { date } : {} }),
      );
      const result = ApiDailyFleetReportSchema.safeParse(raw);
      if (!result.success) {
        console.error('[daily-fleet-report] /api/fleet-report/daily response failed schema:', result.error.issues);
        this._lastError.set('API response did not match expected shape');
        this.toast.error('Fleet report malformed — API response did not match expected shape');
        return;
      }
      this._report.set(result.data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'fetch failed';
      this._lastError.set(msg);
    } finally {
      this._loading.set(false);
    }
  }
}
