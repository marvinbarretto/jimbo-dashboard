// Shared vertical bar chart wrapper around ng2-charts/Chart.js. One label per
// bar, one value per bar — for ranking views like "minutes per day",
// "switches per domain", etc. Use UiDonutChart when proportion matters more
// than ranking.
//
// Pass `series` instead of `values` to render stacked segments per bar (e.g.
// food vs alcohol calories). `values`/`series` are mutually exclusive — when
// `series` is set the x/y axes stack and a legend appears.
//
// Set `showTrend` on day-ordered charts to overlay a 7-day rolling-median
// line — a median (not a mean) shrugs off single outlier days (a big night
// out, a misattributed late entry) instead of smearing their effect across
// the whole window, so the underlying trend reads clearly. Only meaningful
// when bars are consecutive days; skip it on categorical charts (e.g.
// "switches per domain").

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ChartConfiguration, ChartDataset, TooltipItem } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { rollingMedian } from '@shared/utils/rolling-median';

const TREND_WINDOW_DAYS = 7;
const TREND_LINE_COLOR = 'rgba(148, 163, 184, 0.9)'; // neutral slate — reads as "trend", not another data series

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
  readonly showTrend = input<boolean>(false);

  /** True once `series` is supplied — switches the chart to stacked mode. */
  readonly stacked = computed(() => this.series().length > 0);

  // The trend line tracks the total per bar — for stacked charts that's the
  // sum across series (e.g. food + alcohol calories), not any one segment.
  private readonly dailyTotals = computed<readonly number[]>(() => {
    const series = this.series();
    if (series.length) {
      const days = series[0]?.values.length ?? 0;
      return Array.from({ length: days }, (_, i) => series.reduce((sum, s) => sum + (s.values[i] ?? 0), 0));
    }
    return this.values();
  });

  private readonly trendLine = computed<readonly number[] | null>(() =>
    this.showTrend() ? rollingMedian(this.dailyTotals(), TREND_WINDOW_DAYS) : null,
  );

  readonly chartData = computed<ChartConfiguration<'bar' | 'line'>['data']>(() => {
    const labels = [...this.labels()];
    const series = this.series();
    const trend = this.trendLine();

    const trendDataset: ChartDataset<'line'> | null = trend && {
      type: 'line',
      data: [...trend],
      label: `${TREND_WINDOW_DAYS}-day median`,
      borderColor: TREND_LINE_COLOR,
      backgroundColor: TREND_LINE_COLOR,
      borderWidth: 2,
      borderDash: [4, 3],
      pointRadius: 0,
      tension: 0.3,
      order: 0,
    };

    if (series.length) {
      return {
        labels,
        datasets: [
          ...series.map((s, i): ChartDataset<'bar'> => {
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
          ...(trendDataset ? [trendDataset] : []),
        ],
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
        ...(trendDataset ? [trendDataset] : []),
      ],
    };
  });

  readonly chartOptions = computed<ChartConfiguration<'bar' | 'line'>['options']>(() => {
    const suffix = this.suffix();
    const stacked = this.stacked();
    const showLegend = stacked || this.showTrend();
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { display: showLegend, position: 'bottom' },
        tooltip: {
          callbacks: {
            label: (ctx: TooltipItem<'bar' | 'line'>) => {
              const y = ctx.parsed.y ?? 0;
              const prefix = stacked || ctx.dataset.type === 'line' ? `${ctx.dataset.label}: ` : '';
              return `${prefix}${Math.round(y)}${suffix}`;
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
