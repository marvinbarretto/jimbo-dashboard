// A running total against the shape of a typical period — "how far along am I,
// and is that where I usually am by now".
//
// Distinct from UiBarChart on purpose. Bars answer "when did it happen", which
// is a distribution question; this answers "how far have I got", which is an
// accumulation one. The same underlying minutes read completely differently:
// a quiet afternoon is one short bar among many, but a line that stops rising
// and falls away from its ghost.
//
// The ghost is the whole point. Without it this is a differently-shaped
// version of the bar chart, and cannot say whether today is normal.

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ChartConfiguration, ChartDataset, TooltipItem } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

const ACTUAL_COLOR = 'rgba(96, 165, 250, 1)';
const ACTUAL_FILL = 'rgba(96, 165, 250, 0.14)';
// Neutral slate, dashed, no fill — reads as a reference, not a second series.
const GHOST_COLOR = 'rgba(148, 163, 184, 0.85)';

@Component({
  selector: 'app-ui-cumulative-chart',
  imports: [BaseChartDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="chart" [style.--chart-height.px]="height()">
      <canvas
        baseChart
        type="line"
        [data]="chartData()"
        [options]="chartOptions()"
        [legend]="false"
      ></canvas>
    </div>
  `,
  styles: [`
    .chart {
      position: relative;
      width: 100%;
      height: var(--chart-height, 200px);
    }
  `],
})
export class UiCumulativeChart {
  /** One label per point on the reference axis — hours, days of a week. */
  readonly labels = input.required<readonly string[]>();
  /** The running total so far. May be shorter than `labels` on a live period. */
  readonly values = input.required<readonly number[]>();
  /** The typical shape, full length. Null withholds the comparison entirely. */
  readonly baseline = input<readonly number[] | null>(null);
  readonly valueLabel = input<string>('Today');
  readonly baselineLabel = input<string>('Typical');
  readonly suffix = input<string>('');
  readonly height = input<number>(200);
  /** Formats the tooltip figure; defaults to a rounded number plus `suffix`. */
  readonly format = input<((value: number) => string) | null>(null);

  protected readonly chartData = computed<ChartConfiguration<'line'>['data']>(() => {
    const baseline = this.baseline();

    const actual: ChartDataset<'line'> = {
      data: [...this.values()],
      label: this.valueLabel(),
      borderColor: ACTUAL_COLOR,
      backgroundColor: ACTUAL_FILL,
      borderWidth: 2,
      // The fill is what makes accumulation legible as volume rather than as
      // just another trend line.
      fill: 'origin',
      pointRadius: 0,
      // The final point is "now" — the one place on the line worth marking.
      pointHoverRadius: 4,
      tension: 0.25,
      order: 0,
      spanGaps: false,
    };

    return {
      labels: [...this.labels()],
      datasets: baseline
        ? [actual, {
            data: [...baseline],
            label: this.baselineLabel(),
            borderColor: GHOST_COLOR,
            backgroundColor: GHOST_COLOR,
            borderWidth: 1.5,
            borderDash: [4, 3],
            fill: false,
            pointRadius: 0,
            tension: 0.25,
            order: 1,
          }]
        : [actual],
    };
  });

  protected readonly chartOptions = computed<ChartConfiguration<'line'>['options']>(() => {
    const format = this.format();
    const suffix = this.suffix();
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      // Both lines share an x position, so reading them together is the
      // default interaction rather than something you have to hunt for.
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: true, position: 'bottom' },
        tooltip: {
          callbacks: {
            label: (ctx: TooltipItem<'line'>) => {
              const y = ctx.parsed.y ?? 0;
              return `${ctx.dataset.label}: ${format ? format(y) : `${Math.round(y)}${suffix}`}`;
            },
          },
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { autoSkip: true, maxRotation: 0 } },
        y: { beginAtZero: true, ticks: { precision: 0 } },
      },
    };
  });
}
