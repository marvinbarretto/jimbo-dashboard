// Lane scorecard — intake, output, WIP and conversion per lane, from
// GET /api/state/pipeline.
//
// The one rule this component exists to enforce: a zero is never rendered on
// its own. `groom` ships nothing by design and `recon` ships nothing and
// should not; drawing those two identically is the exact failure the state
// endpoint was built to prevent. So every row carries its gate state, and a
// metric that was not measured says so rather than showing 0.

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { UiCard } from '@shared/components/ui-card/ui-card';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { PipelineService } from '../../data-access/pipeline.service';
import type { PipelineLane, PipelineMetric } from '@domain/pipeline';

/** How a lane's output zero should read. */
export type LaneVerdict = 'shipping' | 'by-design' | 'throttled' | 'stalled' | 'n/a';

/**
 * Decide what a lane's output means, given its gate.
 *
 * `stalled` is the only verdict that warrants alarm, and it is deliberately
 * narrow: work went in, nothing came out, and nothing was switched off to
 * cause that. Recon has been in this state for 12 weeks with the API saying
 * so in a field nothing rendered.
 */
export function laneVerdict(lane: PipelineLane): LaneVerdict {
  const { output, intake } = lane.totals;
  // A lane that is not supposed to ship cannot be stalled — grooming produces
  // work, not output, and its null is a category statement, not a reading.
  if (output.state === 'not_applicable') return 'by-design';
  if (output.state !== 'measured') return 'n/a';
  if ((output.value ?? 0) > 0) return 'shipping';
  if ((intake.value ?? 0) === 0) return 'n/a';
  if (lane.gate.state === 'gated') return 'by-design';
  if (lane.gate.state === 'throttled') return 'throttled';
  return 'stalled';
}

@Component({
  selector: 'app-lane-scorecard',
  imports: [UiCard, UiBadge, UiEmptyState],
  templateUrl: './lane-scorecard.html',
  styleUrl: './lane-scorecard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LaneScorecard {
  private readonly service = inject(PipelineService);

  readonly lastError = this.service.lastError;
  readonly warnings = this.service.warnings;
  readonly windowWeeks = this.service.windowWeeks;

  constructor() {
    this.service.start();
  }

  readonly rows = computed(() =>
    this.service.lanes().map(lane => ({ lane, verdict: laneVerdict(lane) })));

  /**
   * Render a metric, or say why there is no number.
   *
   * Never returns '0' for anything that was not actually measured as zero —
   * an unmeasured zero reading as an idle zero is the whole problem.
   */
  metric(m: PipelineMetric, format: 'int' | 'percent' | 'weeks' = 'int'): string {
    if (m.state === 'not_applicable') return '—';
    if (m.state === 'not_measured') return 'not measured';
    if (m.state === 'gated') return 'gated';
    if (m.value === null) return '—';
    if (format === 'percent') return `${(m.value * 100).toFixed(1)}%`;
    if (format === 'weeks') return `${m.value.toFixed(1)}w`;
    return String(m.value);
  }

  /** The note behind a metric, shown on hover — usually the denominator. */
  metricTitle(m: PipelineMetric): string | null {
    const parts = [m.note, m.n === null ? null : `n = ${m.n}`, m.as_of ? `as of ${m.as_of}` : null];
    const text = parts.filter(Boolean).join(' · ');
    return text || null;
  }

  gateTone(lane: PipelineLane): 'success' | 'warning' | 'neutral' {
    if (lane.gate.state === 'open') return 'success';
    if (lane.gate.state === 'throttled') return 'warning';
    return 'neutral';
  }

  verdictTone(verdict: LaneVerdict): 'success' | 'warning' | 'danger' | 'neutral' {
    switch (verdict) {
      case 'shipping': return 'success';
      case 'stalled': return 'danger';
      case 'throttled': return 'warning';
      default: return 'neutral';
    }
  }

  verdictLabel(verdict: LaneVerdict): string {
    switch (verdict) {
      case 'shipping': return 'shipping';
      case 'stalled': return 'nothing out, valves open';
      case 'throttled': return 'zero is the throttle';
      case 'by-design': return 'ships nothing by design';
      default: return 'no reading';
    }
  }
}
