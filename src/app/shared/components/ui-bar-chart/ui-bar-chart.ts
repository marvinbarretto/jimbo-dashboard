// Shared vertical bar chart wrapper around ng2-charts/Chart.js. One label per
// bar, one value per bar — for ranking views like "minutes per day",
// "switches per domain", etc. Use UiDonutChart when proportion matters more
// than ranking.
//
// Pass `series` instead of `values` to render stacked segments per bar (e.g.
// food vs alcohol calories). `values`/`series` are mutually exclusive — when
// `series` is set the x/y axes stack and a legend appears.

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ChartConfiguration, TooltipItem } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

/** One stacked segment across all bars. */
export interface BarSeries {
  label: string;
  values: readonly number[];
  /** Solid fill colour; falls back to a built-in palette slot by index. */
  accent?: string;
}

// Palette for stacked series that don't pin their own accent.
const SERIES_PALETTE: readonly string[] = [
  'rgba(96, 165, 250, 0.8)', // blue
  'rgba(251, 146, 60, 0.8)', // amber
  'rgba(52, 211, 153, 0.8)', // green
  'rgba(232, 121, 249, 0.8)', // fuchsia
];

@Component({
  selector: 'app-ui-bar-chart',
  imports: [BaseChartDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="chart" [style.--chart-height.px]="height()">
      <canvas
        baseChart
        type="bar"
        [data]="chartData()"
        [options]="chartOptions()"
        [legend]="stacked()"
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
export class UiBarChart {
  readonly labels = input.required<readonly string[]>();
  readonly values = input<readonly number[]>([]);
  readonly series = input<readonly BarSeries[]>([]);
  readonly label = input<string>('Value');
  readonly height = input<number>(220);
  readonly suffix = input<string>('');
  readonly accent = input<string | null>(null);

  /** True once `series` is supplied — switches the chart to stacked mode. */
  readonly stacked = computed(() => this.series().length > 0);

  readonly chartData = computed<ChartConfiguration<'bar'>['data']>(() => {
    const labels = [...this.labels()];
    const series = this.series();

    if (series.length) {
      return {
        labels,
        datasets: series.map((s, i) => {
          const fill = s.accent ?? SERIES_PALETTE[i % SERIES_PALETTE.length];
          return {
            data: [...s.values],
            label: s.label,
            backgroundColor: fill,
            borderColor: fill,
            borderWidth: 1,
            borderRadius: 4,
            maxBarThickness: 36,
            stack: 'total',
          };
        }),
      };
    }

    return {
      labels,
      datasets: [
        {
          data: [...this.values()],
          label: this.label(),
          backgroundColor: this.accent() ?? 'rgba(96, 165, 250, 0.7)',
          borderColor: this.accent() ?? 'rgba(96, 165, 250, 1)',
          borderWidth: 1,
          borderRadius: 4,
          maxBarThickness: 36,
        },
      ],
    };
  });

  readonly chartOptions = computed<ChartConfiguration<'bar'>['options']>(() => {
    const suffix = this.suffix();
    const stacked = this.stacked();
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { display: stacked, position: 'bottom' },
        tooltip: {
          callbacks: {
            label: (ctx: TooltipItem<'bar'>) => {
              const y = ctx.parsed.y ?? 0;
              return stacked ? `${ctx.dataset.label}: ${Math.round(y)}${suffix}` : `${y}${suffix}`;
            },
          },
        },
      },
      scales: {
        x: { stacked, grid: { display: false }, ticks: { autoSkip: false, maxRotation: 0 } },
        y: { stacked, beginAtZero: true, ticks: { precision: 0 } },
      },
    };
  });
}
