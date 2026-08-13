import { httpResource } from '@angular/common/http';
import type { LiveStatus } from '@domain/live-status';
import { environment } from '../../../../environments/environment';

/**
 * The home screen's one composite read: steps and the next calendar event for
 * the glance strip, `dispatch_pulse` for the attention row, and the counts
 * behind the launcher badges.
 *
 * A function rather than a service (precedent: frequentFoodsResource) — it's
 * read-only, so there's no write to funnel and nothing to keep in a signal
 * that the resource doesn't already hold.
 *
 * The server serves the calendar half from a short cache, so polling this is
 * cheap; polling it *while hidden* is not, which is why callers wire it through
 * pollWhileVisible.
 */
export function liveStatusResource() {
  return httpResource<LiveStatus>(() => `${environment.dashboardApiUrl}/api/live-status`);
}

/** Fast enough that a started session or a new dispatch shows up unprompted. */
export const LIVE_STATUS_POLL_MS = 60_000;
