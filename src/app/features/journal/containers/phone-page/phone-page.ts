import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { formatPageTitle } from '@app/app-title-strategy';
import { map } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { UiBarChart } from '@shared/components/ui-bar-chart/ui-bar-chart';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiStatCard } from '@shared/components/ui-stat-card/ui-stat-card';
import { UiSubsection } from '@shared/components/ui-subsection/ui-subsection';
import { formatMinutes } from '@shared/utils/datetime.utils';
import {
  daysInMonth,
  daysInWeek,
  formatDayShort,
  isDayKey,
  isMonthKey,
  isWeekKey,
  monthRange,
  todayKey,
  weekStartFromKey,
} from '@shared/utils/date-keys';
import { JournalConsumptionSection } from '../../components/journal-consumption-section/journal-consumption-section';
import { JournalPeriodHeader } from '../../components/journal-period-header/journal-period-header';
import { JournalPhoneSection } from '../../components/journal-phone-section/journal-phone-section';
import {
  JournalDataService,
  type TelemetryEventLite,
} from '../../data-access/journal-data.service';
import { type JournalGranularity, currentKeyFor } from '../../utils/period-links';

interface ApiTelemetryEvents {
  events: Array<{
    id: string; collector: string; type: string; ts: string; ts_end: string | null;
    value: number | null; unit: string | null; source: string | null;
    payload: Record<string, unknown> | null;
  }>;
}

interface ApiPhoneBundle {
  days: Array<{
    since: string;
    screen_minutes: number;
    unlocks: number;
    notifications: number;
    media_sessions: number;
  }>;
  totals: {
    screen_minutes: number;
    unlocks: number;
    notifications: number;
    media_sessions: number;
  };
}

/**
 * The Phone domain. Day: the full hardware/attention rollup + consumption
 * from the day bundle's telemetry. Week/month: consumption only (YouTube
 * segments fetched for the window) — per-day hardware aggregates would need
 * server-side rollups that don't exist yet.
 */
@Component({
  selector: 'app-journal-phone-page',
  imports: [
    UiBarChart,
    UiLoadingState,
    UiSection,
    UiStack,
    UiStatCard,
    UiSubsection,
    JournalConsumptionSection,
    JournalPeriodHeader,
    JournalPhoneSection,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-journal-period-header
      domain="phone"
      [granularity]="granularity()"
      [key]="key()"
    />

    <app-ui-stack gap="lg">
      @if (isDay()) {
        @if (dayLoading()) {
          <app-ui-loading-state message="Pulling the day's data…" />
        } @else {
          <app-journal-phone-section [events]="dayTelemetry()" />
          <app-journal-consumption-section [events]="dayTelemetry()" />
        }
      } @else {
        <app-ui-section title="Phone" [meta]="phoneMeta()">
          @if (phoneBundle(); as pb) {
            <app-ui-stack gap="lg">
              <div class="journal-day__stats">
                <app-ui-stat-card label="Screen time" [value]="formatMinutes(pb.totals.screen_minutes)" [detail]="pb.totals.unlocks + ' unlocks'" />
                <app-ui-stat-card label="Notifications" [value]="pb.totals.notifications.toString()" />
                <app-ui-stat-card label="Media" [value]="pb.totals.media_sessions.toString()" detail="sessions" />
              </div>

              <div class="journal-day__split">
                <app-ui-subsection label="Screen time per day">
                  <app-ui-bar-chart
                    [labels]="phoneDayLabels()"
                    [values]="screenPerDay()"
                    label="Minutes"
                    suffix=" min"
                    accent="rgba(99, 179, 237, 0.7)"
                    [showTrend]="true"
                  />
                </app-ui-subsection>

                <app-ui-subsection label="Notifications per day">
                  <app-ui-bar-chart
                    [labels]="phoneDayLabels()"
                    [values]="notifsPerDay()"
                    label="Notifications"
                    suffix=""
                    accent="rgba(168, 85, 247, 0.7)"
                    [showTrend]="true"
                  />
                </app-ui-subsection>
              </div>
            </app-ui-stack>
          } @else {
            <app-ui-loading-state message="Pulling phone rollups…" />
          }
        </app-ui-section>

        <app-journal-consumption-section [events]="rangeYoutube()" />
      }
    </app-ui-stack>
  `,
  styleUrl: '../../journal-sections.scss',
})
export class JournalPhonePage {
  private readonly route = inject(ActivatedRoute);
  private readonly titleService = inject(Title);
  private readonly journal = inject(JournalDataService);

  protected readonly granularity = toSignal(
    this.route.data.pipe(map(d => (d['granularity'] ?? 'day') as JournalGranularity)),
    { initialValue: 'day' as JournalGranularity },
  );

  protected readonly key = toSignal(
    this.route.paramMap.pipe(map(p => p.get('date') ?? p.get('week') ?? p.get('month') ?? '')),
    { initialValue: '' },
  );

  private readonly safeKey = computed(() => {
    const g = this.granularity();
    const k = this.key();
    const ok = g === 'day' ? isDayKey(k) : g === 'week' ? isWeekKey(k) : isMonthKey(k);
    return ok ? k : currentKeyFor(g);
  });

  protected readonly isDay = computed(() => this.granularity() === 'day');

  protected readonly dayTelemetry = computed(() => this.journal.day()?.telemetry ?? []);
  protected readonly dayLoading = computed(() =>
    this.journal.loading() === 'day' && this.journal.day()?.date !== this.safeKey());

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

  // Week/month consumption: YouTube watch segments for the window. 1000-row
  // cap ≈ 16h of one-minute segments — enough for any real week; a truncated
  // month under-counts rather than erroring.
  private readonly youtubeRes = httpResource<ApiTelemetryEvents>(() => {
    const w = this.rangeWindow();
    if (!w) return undefined;
    return `${environment.dashboardApiUrl}/api/telemetry/events?collector=youtube&type=watch_session&since=${encodeURIComponent(w.since)}&until=${encodeURIComponent(w.until)}&limit=1000`;
  });

  // Server-side per-day rollups: screen minutes (rolling-window deduped),
  // unlocks, notifications, media sessions.
  private readonly phoneRes = httpResource<ApiPhoneBundle>(() => {
    const w = this.rangeWindow();
    if (!w) return undefined;
    return `${environment.dashboardApiUrl}/api/journal/phone?since=${encodeURIComponent(w.since)}&until=${encodeURIComponent(w.until)}`;
  });

  protected readonly phoneBundle = computed(() =>
    this.phoneRes.hasValue() ? this.phoneRes.value() : null);

  private readonly rangeDays = computed(() =>
    this.granularity() === 'week' ? daysInWeek(this.safeKey())
      : this.granularity() === 'month' ? daysInMonth(this.safeKey())
      : []);

  protected readonly phoneDayLabels = computed(() =>
    this.granularity() === 'week'
      ? this.rangeDays().map(d => formatDayShort(d))
      : this.rangeDays().map(d => d.slice(-2)));

  protected readonly screenPerDay = computed(() =>
    (this.phoneBundle()?.days ?? []).map(d => d.screen_minutes));
  protected readonly notifsPerDay = computed(() =>
    (this.phoneBundle()?.days ?? []).map(d => d.notifications));

  protected readonly phoneMeta = computed(() => {
    const t = this.phoneBundle()?.totals;
    if (!t) return '';
    return `${formatMinutes(t.screen_minutes)} screen · ${t.notifications} notifications`;
  });

  protected readonly formatMinutes = formatMinutes;

  protected readonly rangeYoutube = computed<TelemetryEventLite[]>(() => {
    if (!this.youtubeRes.hasValue()) return [];
    return (this.youtubeRes.value().events ?? []).map(e => ({ ...e, ts_end: e.ts_end ?? null, source: e.source ?? null }));
  });

  constructor() {
    effect(() => this.titleService.setTitle(formatPageTitle(`Phone — ${this.safeKey()}`)));
    effect(() => {
      if (this.isDay()) void this.journal.loadDay(this.safeKey());
    });
    const id = setInterval(() => {
      if (this.isDay() && this.safeKey() === todayKey()) void this.journal.loadDay(this.safeKey());
    }, 60_000);
    inject(DestroyRef).onDestroy(() => clearInterval(id));
  }
}
