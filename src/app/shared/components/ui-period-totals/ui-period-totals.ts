import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { UiSegmented, type UiSegmentedOption } from '@shared/components/ui-segmented/ui-segmented';
import { UiStatCard } from '@shared/components/ui-stat-card/ui-stat-card';
import { UiProgressMeter } from '@shared/components/ui-progress-meter/ui-progress-meter';
import type { TrackerDailyTotal, TrackerMeasure } from '@shared/components/tracker/tracker.types';
import { londonToday } from '@shared/utils/datetime.utils';
import { periodWindow, type TrackerPeriod } from './period-window';

const PERIODS: readonly UiSegmentedOption[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
];

/**
 * Roll daily totals up to a day / week / month window and render one tile per
 * measure: a {@link UiProgressMeter} when the measure has a target, else a
 * {@link UiStatCard}. Week/month tiles also show an average-per-day, and scale
 * the target by the days elapsed so the meter stays meaningful across windows.
 *
 * Pure presentation over a generic `daily` rollup — no coupling to nutrition's
 * endpoint shape, so any tracker can surface "how am I trending" the same way.
 */
@Component({
  selector: 'app-ui-period-totals',
  imports: [UiSegmented, UiStatCard, UiProgressMeter],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="period-totals">
      <header class="period-totals__head">
        <app-ui-segmented
          [options]="periods"
          [value]="period()"
          ariaLabel="Totals window"
          (changed)="period.set($any($event))"
        />
        <span class="period-totals__range">{{ rangeLabel() }}</span>
      </header>

      <div class="period-totals__grid">
        @for (t of tiles(); track t.key) {
          @if (t.target !== null) {
            <app-ui-progress-meter
              [label]="t.label"
              [current]="t.total"
              [target]="t.target"
              [unit]="t.unit"
            />
          } @else {
            <app-ui-stat-card
              [label]="t.label"
              [value]="t.value"
              [detail]="t.detail"
            />
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .period-totals {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .period-totals__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .period-totals__range {
      font-size: 0.78rem;
      color: var(--color-text-muted);
      font-variant-numeric: tabular-nums;
    }

    .period-totals__grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(11rem, 100%), 1fr));
      gap: 0.6rem;
      align-items: stretch;
    }
  `],
})
export class UiPeriodTotals {
  readonly measures = input.required<readonly TrackerMeasure[]>();
  readonly daily = input.required<readonly TrackerDailyTotal[]>();
  /** Per-day target per measure key; scaled by elapsed days for week/month. */
  readonly targets = input<Readonly<Record<string, number>>>({});
  /** Anchor day (YYYY-MM-DD) defining the current day/week/month. */
  readonly anchor = input<string>(londonToday());

  protected readonly periods = PERIODS;
  protected readonly period = signal<TrackerPeriod>('day');

  private readonly window = computed(() => periodWindow(this.period(), this.anchor()));

  protected readonly rangeLabel = computed(() => this.window().label);

  protected readonly tiles = computed(() => {
    const { start, end, elapsedDays } = this.window();
    const rows = this.daily().filter((r) => r.date >= start && r.date <= end);
    const targets = this.targets();
    const sumKey = (key: string) => rows.reduce((s, r) => s + (r.values[key] ?? 0), 0);

    return this.measures().map((m) => {
      const total = Math.round(sumKey(m.key));
      const unit = m.unit ?? '';

      // Share measures read as "X% of <other>", with the absolute as detail.
      if (m.share) {
        const ofTotal = sumKey(m.share.of);
        const pct = ofTotal > 0 ? Math.round((total / ofTotal) * 100) : 0;
        return {
          key: m.key,
          label: m.label,
          unit,
          total,
          target: null,
          value: `${pct}%`,
          detail: `${total}${unit ? ` ${unit}` : ''}`,
        };
      }

      const dailyTarget = targets[m.key];
      const target = typeof dailyTarget === 'number' ? Math.round(dailyTarget * elapsedDays) : null;
      const avg = elapsedDays > 1 ? Math.round(total / elapsedDays) : null;
      return {
        key: m.key,
        label: m.label,
        unit,
        total,
        target,
        value: `${total}${unit ? ` ${unit}` : ''}`,
        detail: avg !== null ? `avg ${avg}${unit ? ` ${unit}` : ''}/day` : null,
      };
    });
  });
}
