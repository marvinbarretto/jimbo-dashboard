import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { formatPageTitle } from '@app/app-title-strategy';
import { map } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import {
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

/**
 * The Phone domain. Day: the full hardware/attention rollup + consumption
 * from the day bundle's telemetry. Week/month: consumption only (YouTube
 * segments fetched for the window) — per-day hardware aggregates would need
 * server-side rollups that don't exist yet.
 */
@Component({
  selector: 'app-journal-phone-page',
  imports: [
    UiEmptyState,
    UiLoadingState,
    UiSection,
    UiStack,
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
        <app-journal-consumption-section [events]="rangeYoutube()" />
        <app-ui-section title="Phone" meta="day view only">
          <app-ui-empty-state
            message="Screen/notification/battery rollups are day-scoped for now — pick a day from Overview or Work to drill in." />
        </app-ui-section>
      }
    </app-ui-stack>
  `,
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

  // Week/month consumption: YouTube watch segments for the window. 1000-row
  // cap ≈ 16h of one-minute segments — enough for any real week; a truncated
  // month under-counts rather than erroring.
  private readonly youtubeRes = httpResource<ApiTelemetryEvents>(() => {
    if (this.isDay()) return undefined;
    const g = this.granularity();
    const key = this.safeKey();
    let since: string;
    let until: string;
    if (g === 'week') {
      const start = weekStartFromKey(key);
      const end = new Date(start);
      end.setDate(start.getDate() + 7);
      since = start.toISOString();
      until = end.toISOString();
    } else {
      const { start, end } = monthRange(key);
      const dayAfterEnd = new Date(end);
      dayAfterEnd.setDate(end.getDate() + 1);
      since = start.toISOString();
      until = dayAfterEnd.toISOString();
    }
    return `${environment.dashboardApiUrl}/api/telemetry/events?collector=youtube&type=watch_session&since=${encodeURIComponent(since)}&until=${encodeURIComponent(until)}&limit=1000`;
  });

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
