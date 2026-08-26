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
    @if (segments().length > 0) {
      <svg
        [attr.viewBox]="viewBox"
        preserveAspectRatio="none"
        role="img"
        [attr.aria-label]="ariaLabel()"
        focusable="false">
        @for (segment of segments(); track $index) {
          <polyline
            class="ui-sparkline__line"
            [attr.points]="segment"
            fill="none"
            vector-effect="non-scaling-stroke" />
        }
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
  /**
   * Oldest first, newest last. Fewer than two readings renders nothing.
   *
   * `null` is a gap — no data for that step — and is drawn as a break in the
   * line rather than a dip to the floor. A chart that renders an outage as a
   * zero reports a decline that never happened.
   */
  readonly values = input.required<readonly (number | null)[]>();
  readonly ariaLabel = input<string>('Recent trend');

  protected readonly viewBox = `0 0 ${VB_W} ${VB_H}`;

  protected readonly points = computed<readonly ({ x: number; y: number } | null)[]>(() => {
    const values = this.values();
    const readings = values.filter((v): v is number => v !== null);
    // One reading is not a trend — drawing a dot would imply something the data
    // cannot support, so render nothing at all.
    if (values.length < 2 || readings.length < 2) return [];

    const min = Math.min(...readings);
    const max = Math.max(...readings);
    const span = max - min;
    const usable = VB_H - PAD_Y * 2;

    return values.map((v, i) => v === null ? null : ({
      x: (i / (values.length - 1)) * VB_W,
      // A flat run has no span to normalise against; centre it rather than
      // dividing by zero or pinning it to the floor (which would read as zero).
      y: span === 0 ? VB_H / 2 : PAD_Y + (1 - (v - min) / span) * usable,
    }));
  });

  /**
   * Contiguous runs of readings. A gap ends one run and starts the next, so the
   * line breaks there instead of drawing straight through a period we have no
   * data for — the visual difference between "nothing happened" and "we were
   * not looking".
   */
  protected readonly segments = computed<string[]>(() => {
    const out: string[] = [];
    let run: string[] = [];
    for (const p of this.points()) {
      if (p === null) {
        if (run.length > 1) out.push(run.join(' '));
        run = [];
      } else {
        run.push(`${p.x.toFixed(2)},${p.y.toFixed(2)}`);
      }
    }
    if (run.length > 1) out.push(run.join(' '));
    return out;
  });

  protected readonly lastPoint = computed(() => {
    const points = this.points();
    for (let i = points.length - 1; i >= 0; i--) {
      const p = points[i];
      if (p) return p;
    }
    return null;
  });
}
