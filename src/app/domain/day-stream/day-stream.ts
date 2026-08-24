/**
 * The day stream — one logical day as a single chronological body.
 *
 * Mirrors `GET /api/journal/day-stream`. The shape is deliberately generic:
 * a moment is normalised across every source so one component renders a walk,
 * a code session and a mood check without per-source branching, and anything
 * source-specific lives in `meta`, which no renderer has to understand.
 *
 * The server owns the registry of sources. New signals appear here as new
 * `source` values with no change to these types — which is the point.
 */

export type MomentCategory =
  | 'work'
  | 'body'
  | 'state'
  | 'consumption'
  | 'fleet'
  | 'schedule'
  | 'vault';

export interface Moment {
  readonly ts: string;
  /** End of a span; null for point events like a mood check or a commit. */
  readonly ts_end: string | null;
  /** Contributor id — joins to `Signal.id`. */
  readonly source: string;
  readonly category: MomentCategory;
  /** Discriminator within a source: `walk`, `code_session`, `commit`, … */
  readonly kind: string;
  readonly title: string;
  readonly detail: string | null;
  readonly project_id: string | null;
  readonly value: number | null;
  readonly unit: string | null;
  readonly meta: Record<string, unknown>;
}

export interface DayAggregate {
  readonly source: string;
  readonly category: MomentCategory;
  readonly key: string;
  readonly label: string;
  readonly value: number | null;
  readonly unit: string | null;
}

/**
 * `dead` is the load-bearing one. A source rendered as `0` instead of dead is
 * how the GitHub commit poller went unnoticed for eleven days, so the UI must
 * never collapse these three into "no data".
 */
export type SignalStatus = 'live' | 'quiet' | 'dead';

export interface Signal {
  readonly id: string;
  readonly label: string;
  readonly category: MomentCategory;
  readonly mode: 'moments' | 'aggregate';
  readonly status: SignalStatus;
  readonly count: number;
  readonly last_seen: string | null;
  readonly stale_days: number | null;
  readonly note: string | null;
}

export interface DayStream {
  readonly day: string;
  readonly window: { readonly start: string; readonly end: string; readonly cutover_note: string };
  readonly generated_at: string;
  readonly moments: readonly Moment[];
  readonly aggregates: readonly DayAggregate[];
  readonly signals: readonly Signal[];
  readonly dead_signals: readonly string[];
}
