import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';
import type { JournalOverview } from '@domain/journal/overview';
import { environment } from '../../../../environments/environment';

/**
 * The day's metrics with their comparisons already made.
 *
 * Thin by design — every rule that could be argued about (which baseline,
 * how a live day is truncated, when a sample is disqualified) lives in
 * jimbo-api so that this page, a briefing and a Telegram digest quote the
 * same number. Re-deriving any of it here would be the start of them
 * disagreeing.
 */
@Injectable({ providedIn: 'root' })
export class JournalOverviewService {
  private readonly http = inject(HttpClient);

  /**
   * Fetches one day's metric comparisons.
   *
   * @param date - Local day key (YYYY-MM-DD)
   * @returns The overview payload for that day
   */
  overview(date: string): Observable<JournalOverview> {
    return this.http.get<JournalOverview>(
      `${environment.dashboardApiUrl}/api/journal/overview`,
      { params: { date } },
    );
  }
}
