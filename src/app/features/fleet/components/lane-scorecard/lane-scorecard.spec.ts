import { describe, it, expect } from 'vitest';
import { laneVerdict } from './lane-scorecard';
import type { PipelineLane, PipelineMetric } from '@domain/pipeline';

function measured(value: number): PipelineMetric {
  return { value, state: 'measured', n: value, as_of: '2026-08-31', note: null };
}

function notApplicable(note: string | null = null): PipelineMetric {
  return { value: null, state: 'not_applicable', n: null, as_of: null, note };
}

function lane(overrides: Partial<PipelineLane> = {}): PipelineLane {
  return {
    lane: 'a-lane',
    description: 'A lane.',
    gate: { state: 'open', reason: null, controls: [] },
    output_event: 'a merged pull request (pr_state = merged)',
    weeks: [],
    totals: {
      intake: measured(10),
      started: measured(5),
      output: measured(3),
      wip: measured(1),
      lead_time_weeks: measured(2),
      conversion: measured(0.3),
    },
    ...overrides,
  };
}

/**
 * Cases are the four real lanes from /api/state/pipeline on 2026-09-04. The
 * point of the verdict is that three of them produce a zero or near-zero and
 * only one of those is a problem.
 */
describe('laneVerdict — telling apart the zeros', () => {
  it('calls an open lane that took work and shipped nothing stalled', () => {
    // recon: 164 in, 0 out over 12 weeks, valves fully open. The API has been
    // flagging this in `warnings` the whole time.
    const recon = lane({
      lane: 'recon',
      gate: { state: 'open', reason: null, controls: [] },
      totals: { ...lane().totals, intake: measured(164), started: measured(0), output: measured(0) },
    });
    expect(laneVerdict(recon)).toBe('stalled');
  });

  it('does not call a throttled lane stalled for producing little', () => {
    // commission: capped at 1 item per tick. Low output is the setting working.
    const commission = lane({
      lane: 'commission',
      gate: { state: 'throttled', reason: 'throughput capped at 1 item(s) per tick.', controls: [] },
      totals: { ...lane().totals, intake: measured(207), output: measured(0) },
    });
    expect(laneVerdict(commission)).toBe('throttled');
  });

  it('does not call a lane that is not meant to ship stalled', () => {
    // groom prepares work; its output is not_applicable, not zero.
    const groom = lane({
      lane: 'groom',
      totals: {
        ...lane().totals,
        intake: measured(3696),
        started: notApplicable(),
        output: notApplicable('This lane prepares work; it is not supposed to ship anything.'),
      },
    });
    expect(laneVerdict(groom)).toBe('by-design');
  });

  it('calls a lane that is shipping shipping', () => {
    const vault = lane({ lane: 'vault', totals: { ...lane().totals, intake: measured(2049), output: measured(229) } });
    expect(laneVerdict(vault)).toBe('shipping');
  });

  it('does not accuse a lane that took no work of stalling', () => {
    // Nothing in, nothing out is not a fault — there was nothing to ship.
    expect(laneVerdict(lane({ totals: { ...lane().totals, intake: measured(0), output: measured(0) } }))).toBe('n/a');
  });

  it('treats a deliberately gated lane as intent even with work queued', () => {
    const gated = lane({
      gate: { state: 'gated', reason: 'pipeline.gate.recon set to off.', controls: [] },
      totals: { ...lane().totals, intake: measured(50), output: measured(0) },
    });
    expect(laneVerdict(gated)).toBe('by-design');
  });

  it('does not turn an unmeasured output into a verdict', () => {
    const unmeasured = lane({
      totals: {
        ...lane().totals,
        output: { value: null, state: 'not_measured', n: 0, as_of: null, note: null },
      },
    });
    expect(laneVerdict(unmeasured)).toBe('n/a');
  });
});
