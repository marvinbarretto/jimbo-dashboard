import type { components } from '../api-types.generated';

/**
 * The day's headline metrics with their comparisons already resolved.
 *
 * Derived from the OpenAPI contract rather than re-declared: the comparison
 * rules live server-side precisely so every consumer quotes one figure, and a
 * hand-written mirror of this shape would be the first place that guarantee
 * broke.
 */
export type JournalOverview = components['schemas']['JournalOverview'];

export type OverviewMetric = JournalOverview['metrics'][number];
export type MetricKey = OverviewMetric['key'];

/** Lookup by key — the rail wants named metrics, the payload is an array. */
export function metricByKey(
  overview: JournalOverview | undefined,
  key: MetricKey,
): OverviewMetric | null {
  return overview?.metrics.find(m => m.key === key) ?? null;
}
