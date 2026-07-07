// Fleet observability board (boris-v2 slice 6). Read-only view over
// GET /api/dispatch/stats: worker heartbeats, queue depth per lane,
// worker-side token burn (trailing 5h), recent completions with model +
// token telemetry, and fold cadence.

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiCluster } from '@shared/components/ui-cluster/ui-cluster';
import { UiPageHeader } from '@shared/components/ui-page-header/ui-page-header';
import { UiCard } from '@shared/components/ui-card/ui-card';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiRefreshControl } from '@shared/components/ui-refresh-control/ui-refresh-control';
import { UiStatCard } from '@shared/components/ui-stat-card/ui-stat-card';
import { RelativeTimePipe } from '@shared/pipes/relative-time.pipe';
import { FleetService } from '../../data-access/fleet.service';
import { HermesService } from '../../../hermes/data-access/hermes.service';
import type { FleetWorker } from '@domain/dispatch';

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
    UiStack, UiCluster, UiPageHeader, UiCard, UiBadge, UiEmptyState,
    UiRefreshControl, UiStatCard, RelativeTimePipe, RouterLink,
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
  readonly recent = this.service.recent;
  readonly folds = this.service.folds;

  constructor() {
    this.service.start();
  }

  refresh(): void {
    void this.service.refresh();
  }

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
      estimated_cost: rows.reduce((s, r) => s + r.estimated_cost, 0),
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

  foldIsStale(lastEnqueuedAt: string | null): boolean {
    if (!lastEnqueuedAt) return true;
    return Date.now() - Date.parse(lastEnqueuedAt) > FOLD_STALE_MS;
  }

  formatCost(v: number): string {
    return v >= 0.005 ? `$${v.toFixed(2)}` : v > 0 ? '<$0.01' : '$0.00';
  }

  formatTokens(v: number): string {
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(1)}k`;
    return String(v);
  }
}
