import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, throwError } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';
import { environment } from '../../../environments/environment';

export interface CalendarEntry {
  id: string;
  summary: string;
  accessRole: string;
  primary?: boolean | null;
  backgroundColor?: string;
}

export interface CalendarItemConfig {
  enabled: boolean;
  tag: string | null;
}

export interface CalendarConfigValue {
  calendars: Record<string, CalendarItemConfig>;
}

@Injectable({ providedIn: 'root' })
export class CalendarSettingsService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.dashboardApiUrl;

  readonly calendars = toSignal(
    this.http
      .get<{ calendars: CalendarEntry[] }>(`${this.base}/api/google-calendar/calendars`)
      .pipe(map(r => r.calendars)),
  );

  readonly config = toSignal(
    this.http
      .get<{ value: CalendarConfigValue }>(`${this.base}/api/calendar/config`)
      .pipe(
        map(r => r.value),
        catchError(err =>
          err.status === 404 ? of({ calendars: {} } as CalendarConfigValue) : throwError(() => err),
        ),
      ),
  );

  saveConfig(value: CalendarConfigValue): Observable<unknown> {
    return this.http.put(`${this.base}/api/calendar/config`, { value });
  }
}
