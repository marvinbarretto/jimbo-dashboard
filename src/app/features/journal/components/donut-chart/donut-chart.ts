import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ChartConfiguration, TooltipItem } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';

const PALETTE = [
  '#60a5fa', '#fb923c', '#34d399', '#a78bfa', '#f472b6',
  '#facc15', '#22d3ee', '#f87171', '#4ade80', '#818cf8',
];

@Component({
  selector: 'app-journal-donut-chart',
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
export class JournalDonutChart {
  readonly labels = input.required<readonly string[]>();
  readonly values = input.required<readonly number[]>();
  readonly suffix = input<string>('');
  readonly height = input<number>(240);

  readonly chartData = computed<ChartConfiguration<'doughnut'>['data']>(() => ({
    labels: [...this.labels()],
    datasets: [
      {
        data: [...this.values()],
        backgroundColor: this.labels().map((_, i) => PALETTE[i % PALETTE.length]),
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
