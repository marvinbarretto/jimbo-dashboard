import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  type MetricUnit,
  formatMetricDelta,
  formatMetricPercent,
} from '@shared/utils/metric-format';

/** What the reader should conclude, independent of which way the number moved. */
export type DeltaDirection = 'up' | 'down' | 'level' | 'unavailable';

/**
 * One line of comparison: "▲ +4 vs yesterday".
 *
 * Standalone rather than baked into {@link UiMetric} because the same atom
 * belongs in table rows and list bullets, and because the rules below are the
 * fiddly part — they should have exactly one home.
 *
 * The rules, in the order they are applied:
 * - **No reference → no claim.** A null `previous` renders `unavailableNote`,
 *   never a zero. Absent and zero are different facts and the whole point of
 *   the comparison is lost if they render the same.
 * - **Zero reference → no percentage.** Going from nothing to something is not
 *   a +∞% change; it reads "+6 · none yesterday".
 * - **Direction is not sentiment.** `higherIsBetter` is per-metric because
 *   YouTube minutes and desk minutes move the same way and mean opposite
 *   things.
 */
@Component({
  selector: 'app-ui-delta',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-delta' },
  template: `
    @if (direction() === 'unavailable') {
      @if (unavailableNote(); as note) {
        <span class="ui-delta__line ui-delta__line--muted">{{ note }}</span>
      }
    } @else {
      <span
        class="ui-delta__line"
        [class.ui-delta__line--good]="sentiment() === 'good'"
        [class.ui-delta__line--bad]="sentiment() === 'bad'">
        <span class="ui-delta__arrow" aria-hidden="true">{{ arrow() }}</span>
        <span class="ui-delta__text">{{ text() }}</span>
      </span>
    }
  `,
  styles: [`
    :host {
      display: block;
      font-size: 0.68rem;
      line-height: 1.45;
      color: var(--color-text-muted);
      font-variant-numeric: tabular-nums;
    }

    .ui-delta__line {
      display: inline-flex;
      align-items: baseline;
      gap: 0.28em;
      min-width: 0;
    }

    // Sentiment is carried at low emphasis on purpose: a rail of five tiles
    // should read as one object, not a scoreboard of reds and greens.
    .ui-delta__line--good { color: color-mix(in srgb, var(--color-success, #34d399) 78%, var(--color-text-muted)); }
    .ui-delta__line--bad  { color: color-mix(in srgb, var(--color-danger,  #f87171) 72%, var(--color-text-muted)); }
    .ui-delta__line--muted { opacity: 0.85; }

    .ui-delta__arrow { font-size: 0.9em; }
  `],
})
export class UiDelta {
  /** The value being described. */
  readonly current = input.required<number>();
  /** What it is compared against. `null` means the comparison could not be made. */
  readonly previous = input.required<number | null>();
  /** Trailing phrase — "yesterday", "typical Tue". Rendered as "vs {label}". */
  readonly label = input<string>('yesterday');
  readonly unit = input<MetricUnit>('count');
  /** Per-metric: false for YouTube minutes, sleep debt, failure counts. */
  readonly higherIsBetter = input<boolean>(true);
  /** Append the percentage alongside the absolute difference. */
  readonly showPercent = input<boolean>(false);
  /** Shown instead of a comparison when `previous` is null. */
  readonly unavailableNote = input<string | null>(null);

  private readonly diff = computed(() => {
    const prev = this.previous();
    return prev === null ? null : this.current() - prev;
  });

  readonly direction = computed<DeltaDirection>(() => {
    const d = this.diff();
    if (d === null) return 'unavailable';
    if (d === 0) return 'level';
    return d > 0 ? 'up' : 'down';
  });

  protected readonly sentiment = computed<'good' | 'bad' | 'neutral'>(() => {
    const dir = this.direction();
    if (dir === 'level' || dir === 'unavailable') return 'neutral';
    return (dir === 'up') === this.higherIsBetter() ? 'good' : 'bad';
  });

  protected readonly arrow = computed(() => {
    switch (this.direction()) {
      case 'up': return '▲';
      case 'down': return '▼';
      default: return '—';
    }
  });

  protected readonly text = computed(() => {
    const diff = this.diff();
    const label = this.label();
    if (diff === null) return '';
    if (diff === 0) return `level with ${label}`;

    const magnitude = formatMetricDelta(diff, this.unit());

    // A reference of zero has no meaningful ratio, and "vs yesterday" reads
    // oddly when yesterday had none at all — say so directly instead.
    if (this.previous() === 0) return `${magnitude} · none ${label}`;

    const pct = this.showPercent() ? formatMetricPercent(this.current(), this.previous() ?? 0) : null;
    return pct ? `${magnitude} (${pct}) vs ${label}` : `${magnitude} vs ${label}`;
  });
}
