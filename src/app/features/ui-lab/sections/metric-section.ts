import { ChangeDetectionStrategy, Component } from '@angular/core';
import { UiDelta } from '@shared/components/ui-delta/ui-delta';
import { UiMetric } from '@shared/components/ui-metric/ui-metric';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiSparkline } from '@shared/components/ui-sparkline/ui-sparkline';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiSubhead } from '@shared/components/ui-subhead/ui-subhead';

// Fixed figures, no ambient clock — the lab must render identically on every
// visit or it stops being a reference.
const DESK_SERIES = [286, 341, 198, 402, 355, 310, 256, 192] as const;
const COMMIT_SERIES = [4, 11, 2, 9, 14, 7, 6, 10] as const;
const PROJECT_SERIES = [3, 3, 2, 4, 3, 3, 2, 2] as const;
const FOCUS_SERIES = [5, 7, 2, 8, 6, 5, 4, 0] as const;
const SHORT_SERIES = [286, 192] as const;
const FLAT_SERIES = [4, 4, 4, 4, 4] as const;
const PAIR_SERIES = [2, 9] as const;
const SINGLE_SERIES = [5] as const;
const EMPTY_SERIES: readonly number[] = [];

/**
 * The three primitives that make a number mean something.
 *
 * Built for the journal Overview rebuild, where the page's whole job is to say
 * whether today is normal. Everything here exists to stop a bare counter
 * standing in for that answer.
 */
@Component({
  selector: 'app-metric-section',
  imports: [UiDelta, UiMetric, UiSection, UiSparkline, UiStack, UiSubhead],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../lab-utils.scss'],
  template: `
    <app-ui-section title="Metric, Delta & Sparkline" [collapsible]="false">
      <app-ui-stack gap="lg">
        <p class="ui-lab__support-copy">
          <code>app-ui-metric</code> is a measurement with its context attached —
          value, a near comparison, a baseline comparison, a cumulative figure, and
          the shape of the recent run. It is <em>not</em> a replacement for
          <code>app-ui-stat-card</code>: that one states a fact
          (<em>“Origin — operator-intake”</em>), this one states a number that only
          means something relative to another number.
        </p>

        <app-ui-subhead label="A metric rail" />
        <p class="ui-lab__support-copy">
          Four work metrics for one day. Note the fourth: <code>0</code> would be a
          blank on its own, and reads as a deficit here.
        </p>
        <div class="metric-lab__rail">
          <app-ui-metric
            label="Desk time" [value]="192" unit="minutes"
            [previousValue]="256" [baselineValue]="310" baselineLabel="typical Tue"
            cumulative="week to date · 14h 20m" [series]="deskSeries" />
          <app-ui-metric
            label="Commits" [value]="10"
            [previousValue]="6" [baselineValue]="8" baselineLabel="typical Tue"
            cumulative="week to date · 37" [series]="commitSeries" />
          <app-ui-metric
            label="Projects touched" [value]="2"
            [previousValue]="2" [baselineValue]="3" baselineLabel="typical Tue"
            cumulative="week to date · 5 distinct" [series]="projectSeries" />
          <app-ui-metric
            label="Focus sessions" [value]="0"
            [previousValue]="4" [baselineValue]="5" baselineLabel="typical Tue"
            cumulative="week to date · 11" [series]="focusSeries" />
        </div>

        <app-ui-subhead label="Compact — the supporting strip" />
        <p class="ui-lab__support-copy">
          Half the headline size, for data that supports the page's subject without
          competing with it. <code>YouTube</code> below sets
          <code>higherIsBetter=false</code>: it moves the same way as desk time and
          means the opposite.
        </p>
        <div class="metric-lab__rail metric-lab__rail--compact">
          <app-ui-metric
            [compact]="true" label="Protein" [value]="88" unit="grams"
            [previousValue]="112" cumulative="wk 612g" />
          <app-ui-metric
            [compact]="true" label="Sleep" [value]="380" unit="minutes"
            [baselineValue]="435" [higherIsBetter]="false" baselineLabel="typical"
            [baselinePercent]="false" cumulative="wk avg 6h 48m" />
          <app-ui-metric
            [compact]="true" label="YouTube" [value]="339" unit="minutes"
            [baselineValue]="209" [higherIsBetter]="false" baselineLabel="typical"
            cumulative="wk 19h 04m" />
          <app-ui-metric
            [compact]="true" label="Spend" [value]="0.0032" unit="currency"
            [previousValue]="0.0031" cumulative="mo $0.71" />
          <app-ui-metric
            [compact]="true" label="Failures" [value]="7"
            [previousValue]="0" [higherIsBetter]="false" cumulative="wk 9" />
        </div>

        <app-ui-subhead label="Degraded states" />
        <p class="ui-lab__support-copy">
          The rule these all serve: <strong>absent is never rendered as zero.</strong>
          A missing baseline costs one line of one tile; it never blanks the tile,
          and it never invents a reading.
        </p>
        <div class="metric-lab__rail">
          <app-ui-metric
            label="Desk time" [value]="192" unit="minutes"
            [previousValue]="256" [baselineValue]="null"
            baselineLabel="typical Tue" baselineNote="no typical yet · 2 of 4 Tuesdays"
            cumulative="week to date · 14h 20m" [series]="shortSeries" />
          <app-ui-metric
            label="Weight" [value]="null" unit="kg"
            absentNote="not logged today" cumulative="last reading 4 days ago" />
          <app-ui-metric
            label="Vault groomed" [value]="6"
            [previousValue]="0" [baselineValue]="9" baselineLabel="typical Tue"
            cumulative="week to date · 41" />
          <app-ui-metric
            label="Pomodoros" [value]="4"
            [previousValue]="4" [baselineValue]="4" baselineLabel="typical Tue" />
        </div>

        <app-ui-subhead label="ui-delta on its own" />
        <p class="ui-lab__support-copy">
          The comparison atom, usable in list rows and table cells. Direction is
          not sentiment — <code>higherIsBetter</code> is declared per metric.
        </p>
        <ul class="metric-lab__deltas">
          <li><code>rise, good</code><app-ui-delta [current]="10" [previous]="6" /></li>
          <li><code>fall, bad</code><app-ui-delta [current]="0" [previous]="4" /></li>
          <li><code>rise, bad (inverted)</code><app-ui-delta [current]="339" [previous]="209" unit="minutes" [higherIsBetter]="false" label="typical" /></li>
          <li><code>unchanged</code><app-ui-delta [current]="2" [previous]="2" /></li>
          <li><code>with percentage</code><app-ui-delta [current]="192" [previous]="310" unit="minutes" [showPercent]="true" label="typical Tue" /></li>
          <li><code>from zero — no ratio</code><app-ui-delta [current]="6" [previous]="0" /></li>
          <li><code>no reference</code><app-ui-delta [current]="6" [previous]="null" unavailableNote="no typical yet · 2 of 4" /></li>
          <li><code>no reference, no note</code><app-ui-delta [current]="6" [previous]="null" /></li>
        </ul>

        <app-ui-subhead label="ui-sparkline" />
        <p class="ui-lab__support-copy">
          Inline SVG, not Chart.js — a rail of five tiles would otherwise mean five
          canvases for five decorative polylines. Answers “rising, falling or flat”
          and nothing else. The dot marks the most recent point so the reader knows
          which end is now without an axis.
        </p>
        <ul class="metric-lab__sparks">
          <li><span>falling</span><app-ui-sparkline [values]="deskSeries" /></li>
          <li><span>choppy</span><app-ui-sparkline [values]="commitSeries" /></li>
          <li><span>flat run</span><app-ui-sparkline [values]="flatSeries" /></li>
          <li><span>two points</span><app-ui-sparkline [values]="pairSeries" /></li>
          <li><span>one point — renders nothing</span><app-ui-sparkline [values]="singleSeries" /></li>
          <li><span>empty — renders nothing</span><app-ui-sparkline [values]="emptySeries" /></li>
        </ul>
      </app-ui-stack>
    </app-ui-section>
  `,
  styles: [`
    .metric-lab__rail {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
      gap: 0.75rem;
    }

    .metric-lab__rail--compact {
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    }

    .metric-lab__deltas,
    .metric-lab__sparks {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 0.4rem;
    }

    .metric-lab__deltas li,
    .metric-lab__sparks li {
      display: grid;
      grid-template-columns: 220px 1fr;
      align-items: center;
      gap: 1rem;
      padding: 0.35rem 0;
      border-bottom: 1px solid var(--color-border);
    }

    .metric-lab__deltas li code,
    .metric-lab__sparks li span {
      font-size: 0.7rem;
      color: var(--color-text-muted);
    }

    .metric-lab__sparks app-ui-sparkline { max-width: 160px; }
  `],
})
export class MetricSection {
  protected readonly deskSeries = DESK_SERIES;
  protected readonly commitSeries = COMMIT_SERIES;
  protected readonly projectSeries = PROJECT_SERIES;
  protected readonly focusSeries = FOCUS_SERIES;
  protected readonly shortSeries = SHORT_SERIES;
  protected readonly flatSeries = FLAT_SERIES;
  protected readonly pairSeries = PAIR_SERIES;
  protected readonly singleSeries = SINGLE_SERIES;
  protected readonly emptySeries = EMPTY_SERIES;
}
