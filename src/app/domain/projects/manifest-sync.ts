/**
 * When the repo→dashboard manifest sweep counts as overdue.
 *
 * The sweep (`scripts/manifest-sync-cron.sh`, launchd, every 72h) mirrors a
 * project's `docs/project.md` into Postgres. The project page used to render
 * `synced_at` as a bare relative time, which is the wrong signal in both
 * directions: a six-week-old copy of a manifest nobody has edited in six months
 * is perfectly current, and a copy from this morning of a manifest edited an
 * hour ago is not. **Elapsed time is not staleness.**
 *
 * What IS worth flagging is the sweep failing to run — which is what actually
 * happened, 2026-07-02 to 2026-08-07: the launchd agent died on a PATH fault
 * and exited 127 ten times in a row while the page reported "6 weeks ago" as
 * though nothing were wrong.
 *
 * Drift — the repo moved since we copied — is deliberately NOT modelled.
 * Nothing observes these repos between sweeps (the GitHub webhook handles
 * `issues` and `pull_request`, not `push`), so claiming freshness we can't see
 * would be worse than stating the bound: within the window, "up to 72h behind"
 * is the honest guarantee, and `synced_commit` records which commit a value
 * came from so an odd field can be traced to a diff.
 */

/** Sweep interval, mirroring StartInterval in the launchd plist (72h). */
export const SYNC_INTERVAL_MS = 72 * 60 * 60 * 1000;

/**
 * Grace on top of the interval. Generous on purpose: launchd coalesces runs
 * missed while the laptop slept, so a legitimately-late sweep is normal after
 * a weekend away. Too tight and the warning becomes background noise that
 * teaches you to ignore it — which is how the real failure went unseen.
 */
export const SYNC_GRACE_MS = 24 * 60 * 60 * 1000;

export const SYNC_OVERDUE_MS = SYNC_INTERVAL_MS + SYNC_GRACE_MS;

/**
 * @param syncedAt ISO timestamp of the last successful sweep, or null for a
 *   project that has never been synced (dashboard-owned — never overdue).
 * @param now Current epoch ms, passed in so this is testable without a clock.
 * @returns True when the sweep has not run within its interval plus grace.
 */
export function isSyncOverdue(syncedAt: string | null | undefined, now: number): boolean {
  if (!syncedAt) return false;
  const at = new Date(syncedAt).getTime();
  if (Number.isNaN(at)) return false;
  return now - at > SYNC_OVERDUE_MS;
}
