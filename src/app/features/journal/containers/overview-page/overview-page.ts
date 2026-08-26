import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { formatPageTitle } from '@app/app-title-strategy';
import { map } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import { UiPage } from '@shared/components/ui-page/ui-page';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { isLiveDay } from '@shared/utils/datetime.utils';
import {
  type DayKey,
  formatDayLong,
  dayKeyFromDate,
  formatMonthLong,
  isDayKey,
  isMonthKey,
  isWeekKey,
  monthRange,
  todayKey,
  weekStartFromKey,
} from '@shared/utils/date-keys';
import { JournalDayShape } from '../../components/journal-day-shape/journal-day-shape';
import { JournalMetricRail } from '../../components/journal-metric-rail/journal-metric-rail';
import { JournalSupportStrips } from '../../components/journal-support-strips/journal-support-strips';
import { JournalWorkRealised } from '../../components/journal-work-realised/journal-work-realised';
import { JournalPeriodHeader } from '../../components/journal-period-header/journal-period-header';
import { JournalPeriodSummary } from '../../components/journal-period-summary/journal-period-summary';
import { JournalReportSection } from '../../components/journal-report-section/journal-report-section';
import {
  JournalDataService,
  type TelemetryEventLite,
} from '../../data-access/journal-data.service';
import { JournalDayStreamService } from '../../data-access/journal-day-stream.service';
import { JournalOverviewService } from '../../data-access/journal-overview.service';
import { type JournalGranularity, currentKeyFor, granularitiesFor } from '../../utils/period-links';
import { pollWhileVisible } from '../../utils/live-poll';

interface ApiTelemetryEvents {
  events: Array<{
    id: string; collector: string; type: string; ts: string; ts_end: string | null;
    value: number | null; unit: string | null; source: string | null;
    payload: Record<string, unknown> | null;
  }>;
}

/**
 * The story layer. Day: what today amounts to, told through data rather than
 * prose — four work metrics carrying their own baselines, then the evidence
 * behind them. Week/month: the same cross-domain questions rolled up, plus the
 * per-day trends a single day can't show.
 *
 * Work-first by construction. Body and fleet data support at subordinate
 * weight or live on the domain that owns them; the routine and fuel block that
 * used to head this page took half of it for protein meters and now sits on
 * Body.
 */
@Component({
  selector: 'app-journal-overview-page',
  imports: [
    UiLoadingState,
    UiPage,
    UiStack,
    JournalDayShape,
    JournalMetricRail,
    JournalSupportStrips,
    JournalWorkRealised,
    JournalPeriodHeader,
    JournalPeriodSummary,
    JournalReportSection,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-ui-page width="full">
    <app-journal-period-header
      domain="overview"
      [granularities]="granularities"
      [granularity]="granularity()"
      [key]="key()"
    />

    <app-ui-stack gap="lg">
      <!-- The same two sections at every horizon. The segmented control moves
           the time window; it does not change what the page is. Both read one
           payload whose comparisons are resolved server-side, so a week is the
           same question as a day asked over more of it. -->
      <app-journal-metric-rail />
      <app-journal-day-shape />

      @if (isDay()) {
        <!-- Day-only because both read the day-stream, which is day-keyed by
             construction: "what landed" and "what else happened" are questions
             about a day, not a month. -->
        <app-journal-work-realised [date]="safeKey()" />
        <app-journal-support-strips [date]="safeKey()" />

        <!-- Last, not first. The prose is good, but the data above is now
             self-narrating, and leading with someone else's summary of the day
             undercuts the point of showing the day. -->
        <app-journal-report-section [date]="safeKey()" />
      } @else {
        @if (loading()) {
          <app-ui-loading-state message="Pulling the period's data…" />
        }
        <!-- What a single day cannot answer: the per-day trend, and a way in. -->
        <app-journal-period-summary
          [granularity]="periodGranularity()"
          [key]="safeKey()"
          [youtubeEvents]="rangeYoutube()"
        />
      }
    </app-ui-stack>
    </app-ui-page>
  `,
})
export class JournalOverviewPage {
  private readonly route = inject(ActivatedRoute);
  private readonly titleService = inject(Title);
  private readonly journal = inject(JournalDataService);
  private readonly overview = inject(JournalOverviewService);
  private readonly dayStream = inject(JournalDayStreamService);

  protected readonly granularities = granularitiesFor('overview');

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

  /**
   * A plain day inside the viewed period. The endpoint resolves the containing
   * week or month itself, so the client never has to know that weeks are
   * Monday-anchored — it just names a day it is interested in.
   */
  private readonly overviewDate = computed(() => {
    const key = this.safeKey();
    switch (this.granularity()) {
      case 'day': return key;
      case 'week': return dayKeyFromDate(weekStartFromKey(key));
      case 'month': return `${key}-01`;
    }
  });
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
      // The page owns this fetch, not the sections — the rail and the shape
      // chart read one payload and would otherwise request it twice.
      void this.overview.load(this.overviewDate(), g);
      if (g === 'day') {
        void this.journal.loadDay(k);
        void this.dayStream.load(k);
      } else {
        void this.journal.loadWork(g, k);
      }
    });

    // Keep a live period fresh; past periods load once (the service skips
    // cached immutable windows).
    pollWhileVisible(() => {
      const g = this.granularity();
      const k = this.safeKey();
      if (g === 'day') {
        if (isLiveDay(k)) {
          void this.journal.loadDay(k);
          // force: the comparisons move with the clock even when nothing new
          // has been logged, because every one of them is time-truncated.
          void this.overview.load(k, 'day', true);
          void this.dayStream.load(k, true);
        }
      } else {
        void this.journal.loadWork(g, k);
        void this.overview.load(this.overviewDate(), g, true);
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
