// Shared vertical bar chart wrapper around ng2-charts/Chart.js. One label per
// bar, one value per bar — for ranking views like "minutes per day",
// "switches per domain", etc. Use UiDonutChart when proportion matters more
// than ranking.

import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ChartConfiguration, TooltipItem } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

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
export class UiBarChart {
  readonly labels = input.required<readonly string[]>();
  readonly values = input.required<readonly number[]>();
  readonly label = input<string>('Value');
  readonly height = input<number>(220);
  readonly suffix = input<string>('');
  readonly accent = input<string | null>(null);

  readonly chartData = computed<ChartConfiguration<'bar'>['data']>(() => ({
    labels: [...this.labels()],
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
  }));

  readonly chartOptions = computed<ChartConfiguration<'bar'>['options']>(() => {
    const suffix = this.suffix();
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx: TooltipItem<'bar'>) => `${ctx.parsed.y}${suffix}`,
          },
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { autoSkip: false, maxRotation: 0 } },
        y: { beginAtZero: true, ticks: { precision: 0 } },
      },
    };
  });
}
