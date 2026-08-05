import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type {
  DayCheckCreatePayload,
  DayCheckDef,
  DayCheckEntry,
  DayCheckEntryPayload,
  DayChecksResponse,
} from '@domain/day-checks';
import { environment } from '../../../../environments/environment';

/**
 * Day checks — pull-only. Nothing here subscribes to a push channel, because
 * the push channel measurably doesn't work: scheduled Telegram nudges were
 * answered 2/44 over 21 Jul–5 Aug. This is a surface Marvin opens.
 *
 * `date` everywhere is a *logical* day (the 04:00 cutover), so an 01:30 tick
 * files under the day that's ending. Omit it and the API resolves today.
 */
@Injectable({ providedIn: 'root' })
export class DayChecksService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.dashboardApiUrl}/api/day-checks`;

  /** The tick list for one day: active checks joined to that day's answers. */
  day(date?: string): Observable<DayChecksResponse> {
    const qs = date ? `?date=${encodeURIComponent(date)}` : '';
    return this.http.get<DayChecksResponse>(`${this.base}/day${qs}`);
  }

  listDefs(includeArchived = false): Observable<{ items: DayCheckDef[] }> {
    const qs = includeArchived ? '?include_archived=true' : '';
    return this.http.get<{ items: DayCheckDef[] }>(`${this.base}${qs}`);
  }

  create(payload: DayCheckCreatePayload): Observable<DayCheckDef> {
    return this.http.post<DayCheckDef>(this.base, payload);
  }

  update(
    id: string,
    patch: Partial<Pick<DayCheckDef, 'label' | 'prompt' | 'cadence' | 'active' | 'sort_order' | 'watchdog_ref' | 'notes'>>
      & { archived?: boolean },
  ): Observable<DayCheckDef> {
    return this.http.patch<DayCheckDef>(`${this.base}/${encodeURIComponent(id)}`, patch);
  }

  /**
   * Record or correct an answer. An empty payload on a bool check is a plain
   * tick — the API fills in value_bool: true rather than making every checkbox
   * spell it out.
   */
  setEntry(id: string, payload: DayCheckEntryPayload = {}): Observable<DayCheckEntry> {
    return this.http.put<DayCheckEntry>(`${this.base}/${encodeURIComponent(id)}/entry`, payload);
  }

  /** Un-tick. Removes the answer entirely — "no data", not "answered no". */
  clearEntry(id: string, date?: string): Observable<{ cleared: boolean }> {
    const qs = date ? `?date=${encodeURIComponent(date)}` : '';
    return this.http.delete<{ cleared: boolean }>(`${this.base}/${encodeURIComponent(id)}/entry${qs}`);
  }
}
