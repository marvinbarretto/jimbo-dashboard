import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { formatPageTitle } from '@app/app-title-strategy';
import { map } from 'rxjs';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import { UiPage } from '@shared/components/ui-page/ui-page';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { type DayKey, formatDayLong, isDayKey, todayKey } from '@shared/utils/date-keys';
import { JournalDaySummary } from '../../components/journal-day-summary/journal-day-summary';
import { JournalPeriodHeader } from '../../components/journal-period-header/journal-period-header';
import { JournalTimelineSection } from '../../components/journal-timeline-section/journal-timeline-section';
import { JournalDataService } from '../../data-access/journal-data.service';

/**
 * The glance layer: day summary + reconstructed timeline. Day-granularity
 * only — a timeline is inherently a day construct; Work/Body/Jimbo/Phone
 * carry the week/month rollups.
 */
@Component({
  selector: 'app-journal-overview-page',
  imports: [
    UiEmptyState,
    UiLoadingState,
    UiPage,
    UiStack,
    JournalDaySummary,
    JournalPeriodHeader,
    JournalTimelineSection,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-ui-page width="full">
    <app-journal-period-header
      domain="overview"
      granularity="day"
      [key]="key()"
      [granularities]="['day']"
    />

    <app-journal-day-summary [date]="key()" />

    <app-ui-stack gap="lg">
      @if (loading()) {
        <app-ui-loading-state message="Pulling the day's data…" />
      } @else if (bundle(); as b) {
        <app-journal-timeline-section
          [date]="key()"
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
    </app-ui-page>
  `,
})
export class JournalOverviewPage {
  private readonly route = inject(ActivatedRoute);
  private readonly titleService = inject(Title);
  private readonly journal = inject(JournalDataService);

  protected readonly key = toSignal(
    this.route.paramMap.pipe(map(p => sanitiseDay(p.get('date')))),
    { initialValue: todayKey() },
  );

  protected readonly bundle = this.journal.day;
  protected readonly loading = computed(() =>
    this.journal.loading() === 'day' && this.bundle()?.date !== this.key());

  constructor() {
    effect(() => this.titleService.setTitle(formatPageTitle(formatDayLong(this.key()))));
    effect(() => this.journal.loadDay(this.key()));

    // Keep TODAY live; past days load once (loadDay skips same-key past days).
    const id = setInterval(() => {
      if (this.key() === todayKey()) this.journal.loadDay(this.key());
    }, 60_000);
    inject(DestroyRef).onDestroy(() => clearInterval(id));
  }
}

function sanitiseDay(raw: string | null): DayKey {
  return isDayKey(raw) ? raw : todayKey();
}
