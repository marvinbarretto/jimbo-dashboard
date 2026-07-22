import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { BriefingFeedback } from '../../../briefings/components/briefing-feedback/briefing-feedback';
import { CALENDAR_BOARD_COLUMNS, type BoardColumnConfig } from './calendar-board.config';
import type { SuggestedBlock } from '../../../briefings/data-access/briefing.types';

interface RawCalEvent {
  readonly id: string;
  readonly summary?: string;
  readonly start: { readonly dateTime?: string; readonly date?: string };
  readonly end: { readonly dateTime?: string; readonly date?: string };
}

interface BoardEvent {
  id: string;
  title: string;
  /** 'HH:mm', or null for all-day. */
  time: string | null;
  allDay: boolean;
  past: boolean;
  sortKey: string;
}

interface BoardDay {
  events: BoardEvent[];
  failed: boolean;
}

interface BoardColumn {
  config: BoardColumnConfig;
  loading: boolean;
  today: BoardDay;
  tomorrow: BoardDay;
}

// Read-only today/tomorrow board beside the briefing report: one column per
// calendar (see calendar-board.config.ts — that's the tweakable bit). The
// pencilled column also hosts the briefing's own suggested_blocks, which is
// why the report hides its Suggested blocks section on this page. Columns
// fetch independently so one bad calendar never blanks the board.
//
// Freshness: fetches on load and again whenever the tab regains visibility —
// a tab left open overnight re-anchors "today" and re-dims past events on
// return. No interval polling; refocus covers the real "came back later" case.
@Component({
  selector: 'app-calendar-board',
  imports: [BriefingFeedback],
  templateUrl: './calendar-board.html',
  styleUrl: './calendar-board.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:visibilitychange)': 'onVisibilityChange()',
  },
})
export class CalendarBoard {
  private readonly document = inject(DOCUMENT);

  readonly briefingId = input.required<number>();
  readonly suggestedBlocks = input<SuggestedBlock[]>([]);

  private readonly refreshedAt = signal(new Date());

  private readonly window = computed(() => {
    const now = this.refreshedAt();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    return {
      now,
      todayKey: dateKey(now),
      tomorrowKey: dateKey(tomorrow),
      since: dayStart.toISOString(),
      until: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2).toISOString(),
      todayLabel: now.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' }),
      tomorrowLabel: tomorrow.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' }),
    };
  });

  protected readonly todayLabel = computed(() => this.window().todayLabel);
  protected readonly tomorrowLabel = computed(() => this.window().tomorrowLabel);

  // One resource per configured source; columns aggregate their own sources.
  // Requests read the window signal, so a day rollover refetches by itself;
  // same-day refocus goes through reload() below.
  private readonly sourceResources = CALENDAR_BOARD_COLUMNS.map((config) =>
    config.sources.map((src) =>
      httpResource<{ events: RawCalEvent[] }>(() => ({
        url: `${environment.dashboardApiUrl}/api/google-calendar/events`,
        params: {
          since: this.window().since,
          until: this.window().until,
          calendarId: src.calendarId,
          account: src.account,
        },
      })),
    ),
  );

  protected readonly columns = computed<BoardColumn[]>(() =>
    CALENDAR_BOARD_COLUMNS.map((config, i) => {
      const resources = this.sourceResources[i]!;
      const loading = resources.some((r) => r.isLoading());
      const failed = !loading && resources.every((r) => r.error() !== undefined);
      const events = resources.flatMap((r) => r.value()?.events ?? []);
      return {
        config,
        loading,
        today: { events: this.dayEvents(events, this.window().todayKey), failed },
        tomorrow: { events: this.dayEvents(events, this.window().tomorrowKey), failed },
      };
    }),
  );

  protected onVisibilityChange(): void {
    if (this.document.hidden) return;
    this.refreshedAt.set(new Date());
    for (const column of this.sourceResources) {
      for (const resource of column) resource.reload();
    }
  }

  // One 🍅 per pomodoro, capped like the report's ▰-meter so an outlier
  // suggestion can't wrap the row.
  protected tomatoes(blocks: number): string {
    return '🍅'.repeat(Math.min(blocks, 8));
  }

  private dayEvents(raw: RawCalEvent[], day: string): BoardEvent[] {
    return raw
      .filter((e) => onDay(e, day))
      .map((e) => toBoardEvent(e, this.window().now))
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function onDay(e: RawCalEvent, day: string): boolean {
  if (e.start.date) {
    // All-day: end date is exclusive.
    return e.start.date <= day && (e.end.date === undefined || day < e.end.date);
  }
  const start = e.start.dateTime;
  return start !== undefined && dateKey(new Date(start)) === day;
}

function toBoardEvent(e: RawCalEvent, now: Date): BoardEvent {
  const title = e.summary ?? '(untitled)';
  if (e.start.date) {
    // All-day pins above timed events via the sort key.
    return { id: e.id, title, time: null, allDay: true, past: false, sortKey: `0` };
  }
  const start = new Date(e.start.dateTime!);
  const end = e.end.dateTime ? new Date(e.end.dateTime) : start;
  return {
    id: e.id,
    title,
    time: start.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    allDay: false,
    past: end < now,
    sortKey: `1${e.start.dateTime}`,
  };
}
