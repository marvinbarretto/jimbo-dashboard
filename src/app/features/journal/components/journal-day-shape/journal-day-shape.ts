import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { UiCumulativeChart } from '@shared/components/ui-cumulative-chart/ui-cumulative-chart';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiSubhead } from '@shared/components/ui-subhead/ui-subhead';
import { formatMetric } from '@shared/utils/metric-format';
import { metricByKey } from '@domain/journal/overview';
import { JournalOverviewService } from '../../data-access/journal-overview.service';

/** One label per hour boundary — the x-axis of a day. */
const HOUR_LABELS: readonly string[] = Array.from(
  { length: 24 },
  (_, i) => `${String((i + 1) % 24).padStart(2, '0')}:00`,
);

const WEEKDAY_LABELS: readonly string[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * The period as accumulation, against the shape of a typical one.
 *
 * The rail above says whether the total is normal; this says whether it got
 * there the usual way — a morning that never started and an afternoon that
 * stopped are the same number and completely different days, and the same
 * holds for a week that front-loaded against one that limped.
 *
 * Deliberately not prose. The gap between the two lines is the narration, and
 * a sentence restating it would only be another thing to keep in sync.
 */
@Component({
  selector: 'app-journal-day-shape',
  imports: [UiCumulativeChart, UiEmptyState, UiSubhead],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="day-shape">
      <app-ui-subhead [label]="heading()" [meta]="summary()" />

      @if (desk(); as d) {
        @if (d.profile.cumulative.length > 0) {
          <app-ui-cumulative-chart
            [labels]="axisLabels()"
            [values]="d.profile.cumulative"
            [baseline]="d.profile.baseline"
            [valueLabel]="valueLabel()"
            [baselineLabel]="baselineLabel()"
            [format]="formatDeskMinutes"
            [height]="200" />
        } @else {
          <app-ui-empty-state message="Nothing at the desk yet." />
        }
      }
    </section>
  `,
  styles: [`
    .day-shape { display: block; }
  `],
})
export class JournalDayShape {
  private readonly service = inject(JournalOverviewService);

  /**
   * The x-axis, matched to whatever step the payload used. Derived from the
   * response rather than the route so the labels can never describe a
   * granularity the data is not in.
   */
  protected readonly axisLabels = computed<readonly string[]>(() => {
    const overview = this.service.overview();
    if (!overview) return HOUR_LABELS;
    if (overview.period === 'day') return HOUR_LABELS;
    if (overview.period === 'week') return WEEKDAY_LABELS;
    // A month is 28 to 31 days, so the axis is counted rather than named.
    const days = Math.round(
      (Date.parse(overview.until) - Date.parse(overview.date)) / 86_400_000,
    );
    return Array.from({ length: days }, (_, i) => `${i + 1}`);
  });

  protected readonly desk = computed(() =>
    metricByKey(this.service.overview() ?? undefined, 'desk_minutes'));

  protected readonly valueLabel = computed(() =>
    this.service.overview()?.period === 'day' ? 'Desk time today' : 'Desk time so far');

  protected readonly heading = computed(() => {
    switch (this.service.overview()?.period) {
      case 'week': return "The week's shape";
      case 'month': return "The month's shape";
      default: return "The day's shape";
    }
  });

  protected readonly baselineLabel = computed(() => {
    const overview = this.service.overview();
    if (!overview) return 'Typical day';
    if (overview.period !== 'day') return `Typical ${overview.period}`;
    const weekday = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][overview.weekday];
    return `Typical ${weekday}`;
  });

  /**
   * States both endpoints as a sentence fragment, because the chart's own axis
   * cannot: where today has got to, and where a normal day ends up.
   */
  protected readonly summary = computed(() => {
    const d = this.desk();
    if (!d) return null;
    const now = formatMetric(d.value, 'minutes');
    const end = d.profile.baseline?.at(-1);
    return end === undefined
      ? `${now} so far`
      : `${now} so far · a typical ${this.service.overview()?.period ?? 'day'} ends on ${formatMetric(end, 'minutes')}`;
  });

  protected readonly formatDeskMinutes = (value: number): string => formatMetric(value, 'minutes');
}
