// Reads the "Jimbo Suggestions" Google Calendar — the calendar the
// priority-scheduler cron (Fridays) and Jimbo's recurring check-ins write
// proposed work blocks to. Marvin has reader access only; this service never
// writes.
import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface SuggestionEvent {
  readonly id: string;
  readonly title: string;
  readonly start: string; // ISO datetime, or YYYY-MM-DD when allDay
  readonly end: string | null;
  readonly allDay: boolean;
}

interface RawCalEvent {
  readonly id: string;
  readonly summary?: string;
  readonly start: { readonly dateTime?: string; readonly date?: string };
  readonly end: { readonly dateTime?: string; readonly date?: string };
}

// The calendar ID itself isn't a secret (Marvin's own reader-access
// calendar) — hardcoded here the same way the priority-scheduler cron
// prompt hardcodes it server-side.
const JIMBO_SUGGESTIONS_CALENDAR_ID =
  '2244d4f6d61cbc9f2041405c16dea6726a34f2c895e49dce7c5e1e4f0287789c@group.calendar.google.com';

@Injectable({ providedIn: 'root' })
export class JimboSuggestionsService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.dashboardApiUrl;

  private readonly _events = signal<SuggestionEvent[]>([]);
  private readonly _loading = signal(true);
  private readonly _error = signal(false);

  readonly events = this._events.asReadonly();
  readonly isLoading = this._loading.asReadonly();
  readonly hasError = this._error.asReadonly();

  async load(days = 8): Promise<void> {
    this._loading.set(true);
    this._error.set(false);
    try {
      const res = await firstValueFrom(
        this.http.get<{ events: RawCalEvent[] }>(`${this.base}/api/google-calendar/events`, {
          params: { days, calendarId: JIMBO_SUGGESTIONS_CALENDAR_ID },
        }),
      );
      this._events.set(res.events.map(toSuggestionEvent));
    } catch {
      this._error.set(true);
      this._events.set([]);
    } finally {
      this._loading.set(false);
    }
  }
}

function toSuggestionEvent(e: RawCalEvent): SuggestionEvent {
  const title = e.summary ?? '(untitled)';
  if (e.start.date) {
    return { id: e.id, title, start: e.start.date, end: e.end.date ?? null, allDay: true };
  }
  return { id: e.id, title, start: e.start.dateTime!, end: e.end.dateTime ?? null, allDay: false };
}
