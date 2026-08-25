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
import { JournalDayShape } from '../../components/journal-day-shape/journal-day-shape';
import { JournalMetricRail } from '../../components/journal-metric-rail/journal-metric-rail';
import { JournalPeriodHeader } from '../../components/journal-period-header/journal-period-header';
import { JournalPeriodSummary } from '../../components/journal-period-summary/journal-period-summary';
import { JournalReportSection } from '../../components/journal-report-section/journal-report-section';
import { JournalTimelineSection } from '../../components/journal-timeline-section/journal-timeline-section';
import {
  JournalDataService,
  type TelemetryEventLite,
} from '../../data-access/journal-data.service';
import { JournalOverviewService } from '../../data-access/journal-overview.service';
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
    UiEmptyState,
    UiLoadingState,
    UiPage,
    UiStack,
    JournalChecksSection,
    JournalDayShape,
    JournalMetricRail,
    JournalPeriodHeader,
    JournalPeriodSummary,
    JournalReportSection,
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
      <app-ui-stack gap="lg">
        <!-- Metrics first, then the shape that produced them: the numbers are
             the finding, the chart is why. -->
        <app-journal-metric-rail />
        <app-journal-day-shape />

        <!-- Above the reconstruction, not inside it: the report has already done
             the assembling the timeline below asks the reader to do. -->
        <app-journal-report-section [date]="safeKey()" />
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
  private readonly overview = inject(JournalOverviewService);

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
      if (g === 'day') {
        void this.journal.loadDay(k);
        // The page owns this fetch, not the sections — the rail and the shape
        // chart read one payload and would otherwise request it twice.
        void this.overview.load(k);
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
        if (k === todayKey()) {
          void this.journal.loadDay(k);
          // force: the comparisons move with the clock even when nothing new
          // has been logged, because every one of them is time-truncated.
          void this.overview.load(k, true);
        }
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
