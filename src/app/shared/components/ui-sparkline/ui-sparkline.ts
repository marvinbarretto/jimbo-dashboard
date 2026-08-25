import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Normalised viewBox. The SVG stretches to the host, so these are not pixels. */
const VB_W = 100;
const VB_H = 30;
/** Keeps the stroke and the end dot from clipping at the extremes. */
const PAD_Y = 3;

/**
 * An 8-ish point trend line, no axes, no labels, no tooltip.
 *
 * **Hand-rolled SVG rather than Chart.js on purpose.** A metric rail renders
 * one of these per tile; five Chart.js instances to draw five polylines would
 * cost five canvases and five resize observers for a graphic that is decorative
 * the moment you look away from it. This is a computed path string.
 *
 * It answers one question — "is the recent run of this metric rising, falling,
 * or flat" — and deliberately cannot answer any other. Anything needing values
 * off the chart wants `ui-bar-chart`.
 */
@Component({
  selector: 'app-ui-sparkline',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'ui-sparkline' },
  template: `
    @if (points().length > 0) {
      <svg
        [attr.viewBox]="viewBox"
        preserveAspectRatio="none"
        role="img"
        [attr.aria-label]="ariaLabel()"
        focusable="false">
        <polyline
          class="ui-sparkline__line"
          [attr.points]="polyline()"
          fill="none"
          vector-effect="non-scaling-stroke" />
        @if (lastPoint(); as p) {
          <circle class="ui-sparkline__head" [attr.cx]="p.x" [attr.cy]="p.y" r="2.5" />
        }
      </svg>
    }
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      min-width: 0;
      color: var(--color-text-muted);
    }

    svg {
      display: block;
      width: 100%;
      height: var(--sparkline-height, 26px);
      overflow: visible;
    }

    .ui-sparkline__line {
      stroke: currentColor;
      stroke-width: 1.5;
      stroke-linecap: round;
      stroke-linejoin: round;
      opacity: 0.75;
    }

    // The head marks "today" so a reader knows which end is now without an axis.
    // Non-scaling stroke keeps it circular despite preserveAspectRatio="none".
    .ui-sparkline__head {
      fill: currentColor;
      vector-effect: non-scaling-stroke;
    }
  `],
})
export class UiSparkline {
  /** Oldest first, newest last. Fewer than two points renders nothing. */
  readonly values = input.required<readonly number[]>();
  readonly ariaLabel = input<string>('Recent trend');

  protected readonly viewBox = `0 0 ${VB_W} ${VB_H}`;

  protected readonly points = computed<readonly { x: number; y: number }[]>(() => {
    const values = this.values();
    // One point is not a trend — drawing a dot would imply a reading the data
    // cannot support, so render nothing at all.
    if (values.length < 2) return [];

    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min;
    const usable = VB_H - PAD_Y * 2;

    return values.map((v, i) => ({
      x: (i / (values.length - 1)) * VB_W,
      // A flat run has no span to normalise against; centre it rather than
      // dividing by zero or pinning it to the floor (which would read as zero).
      y: span === 0 ? VB_H / 2 : PAD_Y + (1 - (v - min) / span) * usable,
    }));
  });

  protected readonly polyline = computed(() =>
    this.points().map(p => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' '),
  );

  protected readonly lastPoint = computed(() => this.points().at(-1) ?? null);
}
