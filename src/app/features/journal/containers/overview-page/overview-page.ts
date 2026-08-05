import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { formatPageTitle } from '@app/app-title-strategy';
import { map } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import { UiPage } from '@shared/components/ui-page/ui-page';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import {
  type DayKey,
  formatDayLong,
  formatMonthLong,
  isDayKey,
  isMonthKey,
  isWeekKey,
  monthRange,
  todayKey,
  weekStartFromKey,
} from '@shared/utils/date-keys';
import { JournalChecksSection } from '../../components/journal-checks-section/journal-checks-section';
import { JournalDaySummary } from '../../components/journal-day-summary/journal-day-summary';
import { JournalPeriodHeader } from '../../components/journal-period-header/journal-period-header';
import { JournalPeriodSummary } from '../../components/journal-period-summary/journal-period-summary';
import { JournalTimelineSection } from '../../components/journal-timeline-section/journal-timeline-section';
import {
  JournalDataService,
  type TelemetryEventLite,
} from '../../data-access/journal-data.service';
import { type JournalGranularity, currentKeyFor } from '../../utils/period-links';
import { pollWhileVisible } from '../../utils/live-poll';

interface ApiTelemetryEvents {
  events: Array<{
    id: string; collector: string; type: string; ts: string; ts_end: string | null;
    value: number | null; unit: string | null; source: string | null;
    payload: Record<string, unknown> | null;
  }>;
}

/**
 * The glance layer. Day: summary + reconstructed timeline. Week/month: the
 * same cross-domain questions rolled up over the period, plus the per-day
 * trends and drill-in a single day can't show. The timeline stays day-only —
 * it's inherently a day construct.
 */
@Component({
  selector: 'app-journal-overview-page',
  imports: [
    UiEmptyState,
    UiLoadingState,
    UiPage,
    UiStack,
    JournalChecksSection,
    JournalDaySummary,
    JournalPeriodHeader,
    JournalPeriodSummary,
    JournalTimelineSection,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-ui-page width="full">
    <app-journal-period-header
      domain="overview"
      [granularity]="granularity()"
      [key]="key()"
    />

    @if (isDay()) {
      <app-journal-day-summary [date]="safeKey()" />

      <app-ui-stack gap="lg">
        <app-journal-checks-section [date]="safeKey()" />
        @if (loading()) {
          <app-ui-loading-state message="Pulling the day's data…" />
        } @else if (bundle(); as b) {
          <app-journal-timeline-section
            [date]="safeKey()"
            [sessions]="b.sessions"
            [events]="b.events"
            [telemetry]="b.telemetry"
            [codeSessions]="b.code_sessions"
            [heartbeats]="b.heartbeats"
          />
        } @else {
          <app-ui-empty-state title="No data" message="Couldn't load this day." />
        }
      </app-ui-stack>
    } @else {
      <!-- The summary stays mounted across the load: tearing it down on every
           period change would re-fetch its nutrition/training feeds too. -->
      @if (loading()) {
        <app-ui-loading-state message="Pulling the period's data…" />
      }
      <app-journal-period-summary
        [granularity]="periodGranularity()"
        [key]="safeKey()"
        [youtubeEvents]="rangeYoutube()"
      />
    }
    </app-ui-page>
  `,
})
export class JournalOverviewPage {
  private readonly route = inject(ActivatedRoute);
  private readonly titleService = inject(Title);
  private readonly journal = inject(JournalDataService);

  protected readonly granularity = toSignal(
    this.route.data.pipe(map(d => (d['granularity'] ?? 'day') as JournalGranularity)),
    { initialValue: 'day' as JournalGranularity },
  );

  protected readonly key = toSignal(
    this.route.paramMap.pipe(map(p => p.get('date') ?? p.get('week') ?? p.get('month') ?? '')),
    { initialValue: todayKey() },
  );

  protected readonly safeKey = computed(() => {
    const g = this.granularity();
    const k = this.key();
    const ok = g === 'day' ? isDayKey(k) : g === 'week' ? isWeekKey(k) : isMonthKey(k);
    return ok ? k : currentKeyFor(g);
  });

  protected readonly isDay = computed(() => this.granularity() === 'day');
  /** Narrowed for the period summary, which is week/month only. */
  protected readonly periodGranularity = computed(() =>
    this.granularity() === 'month' ? 'month' as const : 'week' as const);

  protected readonly bundle = this.journal.day;
  private readonly workBundle = this.journal.work;

  protected readonly loading = computed(() => {
    if (this.isDay()) {
      return this.journal.loading() === 'day' && this.bundle()?.date !== this.safeKey();
    }
    const wb = this.workBundle();
    return this.journal.loading() === 'work' &&
      !(wb && wb.granularity === this.periodGranularity() && wb.key === this.safeKey());
  });

  // Local-midnight [since, until) for the viewed week/month; null on day.
  private readonly rangeWindow = computed(() => {
    if (this.isDay()) return null;
    const key = this.safeKey();
    if (this.granularity() === 'week') {
      const start = weekStartFromKey(key);
      const end = new Date(start);
      end.setDate(start.getDate() + 7);
      return { since: start.toISOString(), until: end.toISOString() };
    }
    const { start, end } = monthRange(key);
    const dayAfterEnd = new Date(end);
    dayAfterEnd.setDate(end.getDate() + 1);
    return { since: start.toISOString(), until: dayAfterEnd.toISOString() };
  });

  // YouTube watch segments for the window — the one summary feed with no
  // service behind it (same query the Phone page runs). 1000-row cap ≈ 16h of
  // one-minute segments; a truncated month under-counts rather than erroring.
  private readonly youtubeRes = httpResource<ApiTelemetryEvents>(() => {
    const w = this.rangeWindow();
    if (!w) return undefined;
    return `${environment.dashboardApiUrl}/api/telemetry/events?collector=youtube&type=watch_session&since=${encodeURIComponent(w.since)}&until=${encodeURIComponent(w.until)}&limit=1000`;
  });

  protected readonly rangeYoutube = computed<TelemetryEventLite[]>(() => {
    if (!this.youtubeRes.hasValue()) return [];
    return (this.youtubeRes.value().events ?? [])
      .map(e => ({ ...e, ts_end: e.ts_end ?? null, source: e.source ?? null }));
  });

  constructor() {
    effect(() => this.titleService.setTitle(formatPageTitle(this.pageTitle())));
    effect(() => {
      const g = this.granularity();
      const k = this.safeKey();
      if (g === 'day') void this.journal.loadDay(k);
      else void this.journal.loadWork(g, k);
    });

    // Keep a live period fresh; past periods load once (the service skips
    // cached immutable windows).
    pollWhileVisible(() => {
      const g = this.granularity();
      const k = this.safeKey();
      if (g === 'day') {
        if (k === todayKey()) void this.journal.loadDay(k);
      } else {
        void this.journal.loadWork(g, k);
      }
    });
  }

  private readonly pageTitle = computed(() => {
    const key = this.safeKey();
    switch (this.granularity()) {
      case 'day': return formatDayLong(key as DayKey);
      case 'week': return `Overview — ${key}`;
      case 'month': return `Overview — ${formatMonthLong(key)}`;
    }
  });
}
