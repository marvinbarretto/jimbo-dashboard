// The phone's windowed collectors (usage/screen_session and the
// health_connect aggregates: steps, calories_total, distance, floors) emit
// every ~30 minutes, but each event covers a ROLLING 2-HOUR window
// [ts, ts_end]. Summing raw values therefore over-counts ~4× — a 7k-step day
// read as 26k before this existed. This picks a greedy non-overlapping cover
// of the day's windows and sums only those, pro-rating the final overlapping
// window for the uncovered tail so the last couple of hours aren't dropped.
//
// This is an approximation (window boundaries won't perfectly tile activity)
// but it's unbiased in a way raw summing very much is not.

import type { TelemetryEventLite } from '../data-access/journal-data.service';

/** Assumed span when an event predates ts_end capture. */
const DEFAULT_WINDOW_MS = 2 * 3_600_000;

export function dedupeWindowedSum(
  events: readonly TelemetryEventLite[],
  valueOf: (e: TelemetryEventLite) => number,
): number {
  const windows = events
    .map(e => {
      const startMs = Date.parse(e.ts);
      const endMs = e.ts_end ? Date.parse(e.ts_end) : startMs + DEFAULT_WINDOW_MS;
      return { startMs, endMs, value: valueOf(e) };
    })
    .filter(w => Number.isFinite(w.startMs) && Number.isFinite(w.endMs) && w.endMs > w.startMs)
    .sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs);

  let total = 0;
  let coveredUntil = -Infinity;
  let lastSkipped: { startMs: number; endMs: number; value: number } | null = null;

  // Count a skipped window's share of [coveredUntil, upTo] — the stretch no
  // kept window covers. Runs when a kept window supersedes it and once at
  // the end, so a cluster's trailing activity survives a following gap.
  const settleTail = (upTo: number) => {
    if (!lastSkipped) return;
    const tailEnd = Math.min(lastSkipped.endMs, upTo);
    if (tailEnd > coveredUntil) {
      total += lastSkipped.value * ((tailEnd - coveredUntil) / (lastSkipped.endMs - lastSkipped.startMs));
      coveredUntil = tailEnd;
    }
    lastSkipped = null;
  };

  for (const w of windows) {
    if (w.startMs >= coveredUntil) {
      settleTail(w.startMs);
      total += w.value;
      coveredUntil = w.endMs;
      lastSkipped = null;
    } else if (w.endMs > coveredUntil) {
      // Overlaps the covered range but extends past it — remember the one
      // reaching furthest in case nothing later covers that tail.
      if (!lastSkipped || w.endMs > lastSkipped.endMs) lastSkipped = w;
    }
  }
  settleTail(Infinity);

  return total;
}
