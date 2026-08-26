import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { UiDelta } from '@shared/components/ui-delta/ui-delta';
import { UiSparkline } from '@shared/components/ui-sparkline/ui-sparkline';
import { type MetricUnit, formatMetric } from '@shared/utils/metric-format';

/**
 * A number that carries its own context.
 *
 * The distinction from {@link UiStatCard} is the whole reason this exists:
 * a stat card states a *fact* ("Origin — operator-intake"), this states a
 * *measurement*, and a measurement without a baseline is not information.
 * "0 focus sessions" is a blank; "0, ▼ −5 vs a typical Tuesday" is a finding.
 *
 * Reads bottom-heavy by design — value dominates, then the comparisons that
 * qualify it, then the cumulative figure, then the shape of the recent run.
 * Three comparison lines is the ceiling before a tile stops being scannable.
 *
 * Every contextual input is optional and independently degradable: a missing
 * baseline costs one line, never the tile.
 */
@Component({
  selector: 'app-ui-metric',
  imports: [UiDelta, UiSparkline],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ui-metric',
    '[class.ui-metric--compact]': 'compact()',
  },
  template: `
    <span class="ui-metric__label">{{ label() }}</span>

    <strong class="ui-metric__value">
      @if (value() === null) {
        <span class="ui-metric__absent" aria-hidden="true">—</span>
        <span class="ui-metric__sr">Not recorded</span>
      } @else {
        {{ display() }}
      }
    </strong>

    <div class="ui-metric__context">
      @if (value() !== null && previousValue() !== undefined) {
        <app-ui-delta
          [current]="value() ?? 0"
          [previous]="previousValue() ?? null"
          [label]="previousLabel()"
          [unit]="unit()"
          [higherIsBetter]="higherIsBetter()" />
      }

      @if (value() !== null && baselineValue() !== undefined) {
        <app-ui-delta
          [current]="value() ?? 0"
          [previous]="baselineValue() ?? null"
          [label]="baselineLabel()"
          [unit]="unit()"
          [higherIsBetter]="higherIsBetter()"
          [showPercent]="baselinePercent()"
          [unavailableNote]="baselineNote()" />
      }

      @if (absentNote(); as note) {
        <span class="ui-metric__note">{{ note }}</span>
      }

      @if (cumulative(); as cum) {
        <span class="ui-metric__cumulative">{{ cum }}</span>
      }
    </div>

    @if (series().length > 1) {
      <app-ui-sparkline
        class="ui-metric__spark"
        [values]="series()"
        [ariaLabel]="label() + ' — recent trend'" />
    }
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      min-width: 0;
      padding: 0.7rem 0.8rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      background: var(--color-surface);
    }

    .ui-metric__label {
      font-size: 0.62rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--color-text-soft);
    }

    // The headline. Large enough that the tile reads as a number with notes
    // attached rather than three lines of similar-weight text.
    .ui-metric__value {
      display: block;
      font-size: 1.75rem;
      line-height: 1.15;
      font-weight: 650;
      color: var(--color-text);
      margin: 0.15rem 0 0.3rem;
      font-variant-numeric: tabular-nums;
      overflow-wrap: anywhere;
    }

    :host(.ui-metric--compact) .ui-metric__value { font-size: 1.15rem; }
    :host(.ui-metric--compact) { padding: 0.55rem 0.65rem; }

    // Absent is not zero: an em-dash states "no reading", where a 0 would
    // assert a measurement that was never taken.
    .ui-metric__absent { color: var(--color-text-muted); }

    .ui-metric__sr {
      position: absolute;
      width: 1px; height: 1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }

    .ui-metric__context {
      display: flex;
      flex-direction: column;
      gap: 0.05rem;
      margin-top: auto;
    }

    .ui-metric__note,
    .ui-metric__cumulative {
      font-size: 0.68rem;
      line-height: 1.45;
      color: var(--color-text-muted);
      font-variant-numeric: tabular-nums;
    }

    .ui-metric__spark {
      margin-top: 0.5rem;
    }
  `],
})
export class UiMetric {
  readonly label = input.required<string>();
  /** `null` renders "—": the reading was not taken, which is not the same as 0. */
  readonly value = input.required<number | null>();
  readonly unit = input<MetricUnit>('count');
  /** False where a rise is bad — YouTube minutes, failure counts, sleep debt. */
  readonly higherIsBetter = input<boolean>(true);

  /**
   * Near comparison. Leave undefined to omit the line entirely; pass `null` to
   * say the comparison was attempted and could not be made. On a live day this
   * must already be truncated to the same time of day by the caller.
   */
  readonly previousValue = input<number | null | undefined>(undefined);
  readonly previousLabel = input<string>('yesterday');

  /** Baseline comparison — typically the median of recent same-weekdays. */
  readonly baselineValue = input<number | null | undefined>(undefined);
  readonly baselineLabel = input<string>('typical');
  /** Shown when `baselineValue` is null — e.g. "no typical yet · 2 of 4". */
  readonly baselineNote = input<string | null>(null);
  /** Baselines are the line where a ratio reads better than a raw difference. */
  readonly baselinePercent = input<boolean>(true);

  /** Why there is no reading, shown under the em-dash. */
  readonly absentNote = input<string | null>(null);

  /** Pre-formatted, because "week to date" and "this month" are caller concerns. */
  readonly cumulative = input<string | null>(null);

  /** Oldest first. Under two points the sparkline is omitted. */
  readonly series = input<readonly (number | null)[]>([]);

  /** Half-size variant for the supporting strips. */
  readonly compact = input<boolean>(false);

  protected readonly display = computed(() => {
    const v = this.value();
    return v === null ? '' : formatMetric(v, this.unit());
  });
}
