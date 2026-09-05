// Fleet observability board (boris-v2 slice 6). Read-only view over
// GET /api/dispatch/stats: worker heartbeats, queue depth per lane,
// worker-side token burn (trailing 5h), recent completions with model +
// token telemetry, and fold cadence.

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiPageHeader } from '@shared/components/ui-page-header/ui-page-header';
import { UiCard } from '@shared/components/ui-card/ui-card';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiRefreshControl } from '@shared/components/ui-refresh-control/ui-refresh-control';
import { UiStatCard } from '@shared/components/ui-stat-card/ui-stat-card';
import { JobChip } from '@shared/components/job-chip/job-chip';
import { LaneScorecard } from '../../components/lane-scorecard/lane-scorecard';
import { UiFilterPills, type UiFilterPillOption } from '@shared/components/ui-filter-pills/ui-filter-pills';
import { RelativeTimePipe } from '@shared/pipes/relative-time.pipe';
import { FleetService } from '../../data-access/fleet.service';
import { HermesService } from '../../../hermes/data-access/hermes.service';
import type { FleetMachine, FleetWorker } from '@domain/dispatch';

// Heartbeat freshness thresholds, per worker temperament. Boris (M2) is an
// always-on daemon polling every 30–60s — silence past a few minutes means
// something is wrong. Kipper (M4 laptop) ticks every 5 min ONLY while awake
// and on AC power — long naps are its designed behavior, so amber ("napping")
// is informational, not an alert, until a full day has passed.
const FRESH_MS: Record<string, { live: number; quiet: number }> = {
  boris: { live: 5 * 60_000, quiet: 60 * 60_000 },
  kipper: { live: 10 * 60_000, quiet: 24 * 60 * 60_000 },
};
const DEFAULT_FRESH = { live: 5 * 60_000, quiet: 60 * 60_000 };

export type HeartbeatTone = 'live' | 'quiet' | 'stale' | 'unknown';

// Grace on top of a declared cooldown/execution window before we call it late.
const COOLDOWN_GRACE_MS = 3 * 60_000;
// An 'executing' heartbeat is sent once at claim; the session can then be
// legitimately silent for up to the longest skill timeout (60min) + margin.
const EXECUTING_WINDOW_MS = 65 * 60_000;

export function heartbeatTone(worker: FleetWorker, nowMs: number): HeartbeatTone {
  if (!worker.checked_at) return 'unknown';
  // Deliberate quiet: cooling down until next_poll_at (quota throttle).
  if (worker.status === 'cooldown' && worker.next_poll_at) {
    return nowMs < Date.parse(worker.next_poll_at) + COOLDOWN_GRACE_MS ? 'live' : 'stale';
  }
  const age = nowMs - Date.parse(worker.checked_at);
  // Mid-task: one heartbeat at claim, then silence while the session runs.
  if (worker.status === 'executing') {
    return age < EXECUTING_WINDOW_MS ? 'live' : 'stale';
  }
  const t = FRESH_MS[worker.id] ?? DEFAULT_FRESH;
  if (age < t.live) return 'live';
  if (age < t.quiet) return 'quiet';
  return 'stale';
}

// Fold staleness: the only live fold (travel-research) recurs every 2 days;
// past 3 days without an enqueue means the Hermes-side transport is broken
// (fail-closed — the queue shows nothing, which is exactly the blind spot
// this board exists to close).
const FOLD_STALE_MS = 3 * 24 * 60 * 60_000;

@Component({
  selector: 'app-fleet-board',
  imports: [
    UiStack, UiPageHeader, UiCard, UiBadge, UiEmptyState,
    UiRefreshControl, UiStatCard, RelativeTimePipe, RouterLink, JobChip,
    LaneScorecard, UiFilterPills,
  ],
  templateUrl: './fleet-board.html',
  styleUrl: './fleet-board.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'page-bleed' },
})
export class FleetBoard {
  private readonly service = inject(FleetService);
  // The other half of the fleet: Hermes on the VPS (ambient lane, metered
  // models). Summarised here so one page carries the whole division of
  // labour; the /hermes page has the full control room.
  readonly hermes = inject(HermesService);

  readonly loading = this.service.loading;
  readonly lastError = this.service.lastError;
  readonly lastFetch = this.service.lastFetch;
  readonly workers = this.service.workers;
  readonly machines = this.service.machines;
  readonly recent = this.service.recent;
  readonly folds = this.service.folds;
  readonly now = this.service.now;
  readonly failures = this.service.failures;
  readonly stuckNotes = this.service.stuckNotes;
  readonly lastPipelineEnqueueAt = this.service.lastPipelineEnqueueAt;

  // Anything here means the machinery needs a human: a run failed, or a note
  // is parked where nothing will ever pick it up.
  readonly attentionCount = computed(() => this.failures().length + this.stuckNotes().length);

  // Pump liveness: the tick runs every ~30 min; two missed ticks = presumed
  // dead. Distinguishes "queue empty" from "pump dead" — they look identical
  // from the queue alone.
  readonly pumpStale = computed(() => {
    this.lastFetch();
    const last = this.lastPipelineEnqueueAt();
    if (!last) return true;
    return Date.now() - Date.parse(last) > 70 * 60_000;
  });

  constructor() {
    this.service.start();
  }

  refresh(): void {
    void this.service.refresh();
  }

  /**
   * Dot tone for the hermes strip.
   *
   * Red is reserved for `failing` — a job that is enabled, scheduled, and
   * errored on a recent run. A paused job carrying a six-week-old error goes
   * amber with its date instead. This page spent 42 days showing a red badge
   * for two paused jobs, which is how a reader learns to ignore the only red
   * indicator it has.
   */
  readonly hermesTone = computed<HeartbeatTone>(() => {
    if (this.hermes.failingCount() > 0) return 'stale';
    if (this.hermes.staleErrorCount() > 0) return 'quiet';
    return 'live';
  });

  // Queue rows keyed per lane: one tile per executor with its per-status counts.
  readonly lanes = computed(() => {
    const byExecutor = new Map<string, { executor: string; approved: number; running: number; proposed: number }>();
    for (const row of this.service.queue()) {
      const key = row.executor ?? 'unassigned';
      const lane = byExecutor.get(key) ?? { executor: key, approved: 0, running: 0, proposed: 0 };
      if (row.status === 'approved') lane.approved += row.count;
      else if (row.status === 'running') lane.running += row.count;
      else if (row.status === 'proposed') lane.proposed += row.count;
      byExecutor.set(key, lane);
    }
    return [...byExecutor.values()].sort((a, b) => a.executor.localeCompare(b.executor));
  });

  readonly totalQueued = computed(() =>
    this.service.queue().reduce((sum, row) => sum + row.count, 0));

  // Burn totals across the trailing 5h window (worker-recorded turns only —
  // interactive Claude usage never lands in `costs`, so this is a floor).
  readonly burnRows = this.service.burn;
  readonly burnTotals = computed(() => {
    const rows = this.service.burn();
    return {
      turns: rows.reduce((s, r) => s + r.turns, 0),
      output_tokens: rows.reduce((s, r) => s + r.output_tokens, 0),
      // Unpriced rows (null) contribute nothing rather than NaN-ing the total.
      // The total is already documented as a floor, and this makes it a
      // slightly lower one — see unpricedBurnRows for the honest caveat.
      estimated_cost: rows.reduce((s, r) => s + (r.estimated_cost ?? 0), 0),
    };
  });

  // Keyed off lastFetch so tones re-evaluate on every poll — a worker that
  // goes silent drifts live → quiet → stale without a page reload.
  private readonly workerTones = computed(() => {
    this.lastFetch();
    const now = Date.now();
    return new Map(this.service.workers().map(w => [w.id, heartbeatTone(w, now)]));
  });

  workerTone(worker: FleetWorker): HeartbeatTone {
    return this.workerTones().get(worker.id) ?? 'unknown';
  }

  /** Machines the API has told us are unreachable. */
  readonly staleMachines = computed(() => this.machines().filter(m => m.stale));

  private readonly machineById = computed(() =>
    new Map(this.machines().map(m => [m.id, m])));

  /**
   * Whether this worker's silence is already explained by its machine.
   *
   * Without this the outage reads as four alarms — three silent workers and a
   * stale machine — when it is one fact. The machine card owns it; the workers
   * on it defer.
   */
  workerCoveredByMachine(worker: FleetWorker): boolean {
    if (!worker.machine) return false;
    return this.machineById().get(worker.machine)?.stale === true;
  }

  /**
   * The inverse, and the more useful half: this worker is silent while the box
   * it runs on is demonstrably up, so the worker is the thing that is wrong.
   */
  workerIsAloneInSilence(worker: FleetWorker): boolean {
    const tone = this.workerTone(worker);
    if (tone !== 'stale' && tone !== 'unknown') return false;
    if (!worker.machine) return false;
    const machine = this.machineById().get(worker.machine);
    return machine !== undefined && !machine.stale;
  }

  machineTone(machine: FleetMachine): HeartbeatTone {
    if (machine.suspended) return 'quiet';
    return machine.stale ? 'stale' : 'live';
  }

  foldIsStale(lastEnqueuedAt: string | null): boolean {
    if (!lastEnqueuedAt) return true;
    return Date.now() - Date.parse(lastEnqueuedAt) > FOLD_STALE_MS;
  }

  // null = the model has no pricing row, so the cost is genuinely unknown.
  // Render an em-dash rather than $0.00, which would read as "this was free".
  formatCost(v: number | null): string {
    if (v === null) return '—';
    return v >= 0.005 ? `$${v.toFixed(2)}` : v > 0 ? '<$0.01' : '$0.00';
  }

  /** Models in the 5h window we could not price — makes the burn total's
      incompleteness visible instead of silently understating it. */
  readonly unpricedBurnModels = computed(() =>
    [...new Set(this.service.burn().filter(r => r.estimated_cost === null).map(r => r.model))]);

  // ── Recent completions: filter by flow ───────────────────────────────────
  // 16 of the last 20 rows are jeffrey's groom runs, so the commissions — the
  // ones that actually ship — are pushed off the bottom of the list by volume
  // rather than by being less interesting.

  /** Flows the user has pinned. Empty = show everything, not show nothing. */
  private readonly _flowFilter = signal<readonly string[]>([]);
  readonly flowFilter = this._flowFilter.asReadonly();

  /** Distinct flows present in the current window, with their row counts. */
  readonly flowOptions = computed<UiFilterPillOption[]>(() => {
    const counts = new Map<string, number>();
    for (const row of this.service.recent()) {
      counts.set(row.flow, (counts.get(row.flow) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([value, count]) => ({ value, label: value, count }));
  });

  readonly filteredRecent = computed(() => {
    const active = this._flowFilter();
    if (active.length === 0) return this.service.recent();
    const set = new Set(active);
    return this.service.recent().filter(row => set.has(row.flow));
  });

  toggleFlow(flow: string): void {
    this._flowFilter.update(active =>
      active.includes(flow) ? active.filter(f => f !== flow) : [...active, flow]);
  }

  clearFlowFilter(): void {
    this._flowFilter.set([]);
  }

  formatTokens(v: number): string {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(1)}k`;
    return String(v);
  }
}
