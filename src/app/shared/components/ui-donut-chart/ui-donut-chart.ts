// Shared donut chart wrapper around ng2-charts/Chart.js. Each label is a
// slice, each value its size. Use for time-allocation / proportion views;
// reach for UiBarChart when ranking matters more than the split.

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ChartConfiguration, TooltipItem } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

const PALETTE = [
  '#60a5fa', '#fb923c', '#34d399', '#a78bfa', '#f472b6',
  '#facc15', '#22d3ee', '#f87171', '#4ade80', '#818cf8',
];

@Component({
  selector: 'app-ui-donut-chart',
  imports: [BaseChartDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="chart" [style.--chart-height.px]="height()">
      <canvas
        baseChart
        type="doughnut"
        [data]="chartData()"
        [options]="chartOptions()"
        [legend]="true"
      ></canvas>
    </div>
  `,
  styles: [`
    .chart {
      position: relative;
      width: 100%;
      height: var(--chart-height, 240px);
    }
  `],
})
export class UiDonutChart {
  readonly labels = input.required<readonly string[]>();
  readonly values = input.required<readonly number[]>();
  readonly suffix = input<string>('');
  readonly height = input<number>(240);

  // Per-slice colors aligned with labels. Null/missing entries fall back to
  // the default palette, so callers with partial color data (e.g. some
  // projects lacking a color_token) can pass what they have.
  readonly colors = input<readonly (string | null)[]>([]);

  readonly chartData = computed<ChartConfiguration<'doughnut'>['data']>(() => ({
    labels: [...this.labels()],
    datasets: [
      {
        data: [...this.values()],
        backgroundColor: this.labels().map((_, i) => this.colors()[i] ?? PALETTE[i % PALETTE.length]),
        borderWidth: 0,
      },
    ],
  }));

  readonly chartOptions = computed<ChartConfiguration<'doughnut'>['options']>(() => {
    const suffix = this.suffix();
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      cutout: '60%',
      plugins: {
        legend: {
          position: 'right',
          labels: { boxWidth: 10, boxHeight: 10, padding: 8, font: { size: 11 } },
        },
        tooltip: {
          callbacks: {
            label: (ctx: TooltipItem<'doughnut'>) => `${ctx.label}: ${ctx.parsed}${suffix}`,
          },
        },
      },
    };
  });
}
