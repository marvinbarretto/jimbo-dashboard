// WebSocket stream of system_events. Hydrates with the most recent 200
// rows on connect, then forwards live events from the broadcaster.
//
// Mounted directly in server.ts so it can capture the `upgradeWebSocket`
// instance returned by `serve({ websocket })` without a circular import.

import type { WSEvents } from 'hono/ws';
import { desc } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { systemEvents } from '../../db/schema/index.js';
import { activityBroadcaster, type SystemEventSummary } from '../services/activity-broadcaster.js';

// Hydration size — needs to be big enough to fill the screen with
// recent activity, but small enough that the JSON payload fits in one
// WS frame and the page doesn't lag rendering. 200 rows ≈ a few minutes
// of hermes activity at current rates.
const HYDRATE_LIMIT = 200;

interface HydrateMessage {
  type: 'hydrate';
  events: SystemEventSummary[];
}

interface EventMessage {
  type: 'event';
  event: SystemEventSummary;
}

export type StreamMessage = HydrateMessage | EventMessage;

function rowToSummary(row: typeof systemEvents.$inferSelect): SystemEventSummary {
  return {
    id: row.id,
    ts: row.ts instanceof Date ? row.ts.toISOString() : String(row.ts),
    source: row.source,
    kind: row.kind,
    actor: row.actor,
    title: row.title,
    level: row.level,
    ref_type: row.ref_type,
    ref_id: row.ref_id,
    correlation_id: row.correlation_id,
  };
}

export function createStreamHandlers(): WSEvents {
  let unsubscribe: (() => void) | null = null;

  return {
    async onOpen(_evt, ws) {
      try {
        await activityBroadcaster.start();
      } catch (err) {
        console.error('[stream] broadcaster start failed:', err);
        ws.close(1011, 'broadcaster unavailable');
        return;
      }

      try {
        // DESC then reverse so the client sees chronological order
        // (oldest first, newest last) — matches how live events append.
        const rows = await db
          .select()
          .from(systemEvents)
          .orderBy(desc(systemEvents.ts))
          .limit(HYDRATE_LIMIT);
        const events = rows.map(rowToSummary).reverse();
        ws.send(JSON.stringify({ type: 'hydrate', events } satisfies HydrateMessage));
      } catch (err) {
        console.error('[stream] hydrate failed:', err);
      }

      unsubscribe = activityBroadcaster.subscribe((event) => {
        ws.send(JSON.stringify({ type: 'event', event } satisfies EventMessage));
      });
    },

    onClose() {
      unsubscribe?.();
      unsubscribe = null;
    },

    onError(err) {
      console.error('[stream] ws error:', err);
      unsubscribe?.();
      unsubscribe = null;
    },
  };
}
