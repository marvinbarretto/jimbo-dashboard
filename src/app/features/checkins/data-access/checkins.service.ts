import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { CheckInCreatePayload, MoodDailyRow, MoodLogEntry } from '@domain/checkins';
import { environment } from '../../../../environments/environment';

export type CheckInPatch = Partial<{ mood: number; energy: number; notes: string | null }>;

@Injectable({ providedIn: 'root' })
export class CheckinsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.dashboardApiUrl}/api/checkins`;

  // Entries newest-first. Same date/from/to/days/limit semantics as the
  // nutrition service's list() — a London calendar day, an explicit range,
  // or a trailing window.
  list(
    opts: { date?: string; from?: string; to?: string; days?: number; limit?: number } = {},
  ): Observable<{ items: MoodLogEntry[] }> {
    const params = new URLSearchParams();
    if (opts.date) params.set('date', opts.date);
    if (opts.from && opts.to) {
      params.set('from', opts.from);
      params.set('to', opts.to);
    } else if (opts.days) {
      params.set('days', String(opts.days));
    }
    if (opts.limit) params.set('limit', String(opts.limit));
    const qs = params.toString();
    return this.http.get<{ items: MoodLogEntry[] }>(`${this.base}${qs ? `?${qs}` : ''}`);
  }

  // Per-day mood/energy averages. `from`/`to` (YYYY-MM-DD, inclusive) an
  // explicit range; otherwise a trailing `days` window (default 14).
  daily(opts: { days?: number; from?: string; to?: string } = {}): Observable<{ days: MoodDailyRow[] }> {
    const params = new URLSearchParams();
    if (opts.from && opts.to) {
      params.set('from', opts.from);
      params.set('to', opts.to);
    } else {
      params.set('days', String(opts.days ?? 14));
    }
    return this.http.get<{ days: MoodDailyRow[] }>(`${this.base}/daily?${params.toString()}`);
  }

  create(payload: CheckInCreatePayload): Observable<MoodLogEntry> {
    return this.http.post<MoodLogEntry>(this.base, payload);
  }

  update(id: string, patch: CheckInPatch): Observable<MoodLogEntry> {
    return this.http.patch<MoodLogEntry>(`${this.base}/${encodeURIComponent(id)}`, patch);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${encodeURIComponent(id)}`);
  }
}
