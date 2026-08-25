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

/**
 * The day as accumulation, against the shape of a typical one.
 *
 * The rail above says whether today's total is normal; this says whether it
 * got there the usual way — a morning that never started and an afternoon that
 * stopped are the same number and completely different days.
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
      <app-ui-subhead label="The day's shape" [meta]="summary()" />

      @if (desk(); as d) {
        @if (d.hourly.cumulative.length > 0) {
          <app-ui-cumulative-chart
            [labels]="hourLabels"
            [values]="d.hourly.cumulative"
            [baseline]="d.hourly.baseline"
            valueLabel="Desk time today"
            [baselineLabel]="baselineLabel()"
            [format]="formatDeskMinutes"
            [height]="200" />
        } @else {
          <app-ui-empty-state message="Nothing at the desk yet today." />
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

  protected readonly hourLabels = HOUR_LABELS;

  protected readonly desk = computed(() =>
    metricByKey(this.service.overview() ?? undefined, 'desk_minutes'));

  protected readonly baselineLabel = computed(() => {
    const overview = this.service.overview();
    if (!overview) return 'Typical day';
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
    const end = d.hourly.baseline?.at(-1);
    return end === undefined
      ? `${now} so far`
      : `${now} so far · a typical day ends on ${formatMetric(end, 'minutes')}`;
  });

  protected readonly formatDeskMinutes = (value: number): string => formatMetric(value, 'minutes');
}
