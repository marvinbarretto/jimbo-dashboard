import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { formatPageTitle } from '@app/app-title-strategy';
import { map } from 'rxjs';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import { UiPage } from '@shared/components/ui-page/ui-page';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { isLiveDay } from '@shared/utils/datetime.utils';
import {
  type DayKey,
  daysInMonth,
  daysInWeek,
  isDayKey,
  isMonthKey,
  isWeekKey,
  todayKey,
} from '@shared/utils/date-keys';
import { ExerciseDaySection } from '../../../exercise/components/exercise-day-section/exercise-day-section';
import { ExerciseSummarySection } from '../../../exercise/components/exercise-summary-section/exercise-summary-section';
import { NutritionDaySection } from '../../../nutrition/components/nutrition-day-section/nutrition-day-section';
import { JournalHealthSection } from '../../components/journal-health-section/journal-health-section';
import { JournalPeriodHeader } from '../../components/journal-period-header/journal-period-header';
import { JournalRoutineFuelSection } from '../../components/journal-routine-fuel-section/journal-routine-fuel-section';
import { TrainingFuelSection } from '../../components/training-fuel-section/training-fuel-section';
import { JournalDataService } from '../../data-access/journal-data.service';
import { type JournalGranularity, currentKeyFor, granularitiesFor } from '../../utils/period-links';
import { pollWhileVisible } from '../../utils/live-poll';

/**
 * The Body domain. Day: Health Connect rollup, routine adherence and fuel
 * magnitudes, then the nutrition and exercise ledgers. Week/month: exercise
 * summary + training-fuel (both already range-based).
 *
 * The routine/fuel block arrived from the journal Overview, where protein
 * meters were taking prime space on a work-first page.
 */
@Component({
  selector: 'app-journal-body-page',
  imports: [
    UiLoadingState,
    UiPage,
    UiStack,
    ExerciseDaySection,
    ExerciseSummarySection,
    NutritionDaySection,
    JournalHealthSection,
    JournalPeriodHeader,
    JournalRoutineFuelSection,
    TrainingFuelSection,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-ui-page width="wide">
    <app-journal-period-header
      domain="body"
      [granularities]="granularities"
      [granularity]="granularity()"
      [key]="key()"
    />

    <app-ui-stack gap="lg">
      @if (isDay()) {
        @if (dayLoading()) {
          <app-ui-loading-state message="Pulling the day's data…" />
        } @else {
          <app-journal-health-section [events]="telemetry()" />
        }
        <app-journal-routine-fuel-section [date]="dayKey()" />
        <app-nutrition-day-section [date]="dayKey()" />
        <app-exercise-day-section [date]="dayKey()" />
      } @else {
        <app-exercise-summary-section [from]="rangeFrom()" [to]="rangeTo()" />
        <app-training-fuel-section [from]="rangeFrom()" [to]="rangeTo()" />
      }
    </app-ui-stack>
    </app-ui-page>
  `,
})
export class JournalBodyPage {
  private readonly route = inject(ActivatedRoute);
  private readonly titleService = inject(Title);
  private readonly journal = inject(JournalDataService);

  protected readonly granularities = granularitiesFor('body');

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
  protected readonly dayKey = computed<DayKey>(() => this.safeKey());

  private readonly periodDays = computed(() =>
    this.granularity() === 'week' ? daysInWeek(this.safeKey())
      : this.granularity() === 'month' ? daysInMonth(this.safeKey())
      : []);
  protected readonly rangeFrom = computed(() => this.periodDays()[0] ?? this.safeKey());
  protected readonly rangeTo = computed(() => this.periodDays().at(-1) ?? this.safeKey());

  protected readonly telemetry = computed(() => this.journal.day()?.telemetry ?? []);
  protected readonly dayLoading = computed(() =>
    this.journal.loading() === 'day' && this.journal.day()?.date !== this.safeKey());

  constructor() {
    effect(() => this.titleService.setTitle(formatPageTitle(`Body — ${this.safeKey()}`)));
    // Health needs the day bundle's telemetry; week/month sections self-fetch.
    effect(() => {
      if (this.isDay()) void this.journal.loadDay(this.safeKey());
    });
    pollWhileVisible(() => {
      if (this.isDay() && isLiveDay(this.safeKey())) void this.journal.loadDay(this.safeKey());
    });
  }
}
