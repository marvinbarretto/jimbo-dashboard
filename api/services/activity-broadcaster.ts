// Subscribes to Postgres NOTIFY on 'activity_stream' (trigger lives in
// migration 20260503220000_system_events_payload_and_notify.sql) and
// fans out events to in-process listeners — typically WebSocket
// connections.

import { sql } from '../../db/client.js';

// Compact summary that fits in the 8 KB pg_notify cap. Excludes `detail`
// and `payload` — consumers that want them fetch the full row by id.
export interface SystemEventSummary {
  id: number;
  ts: string;
  source: string;
  kind: string;
  actor: string | null;
  title: string;
  level: string;
  ref_type: string | null;
  ref_id: string | null;
  correlation_id: string | null;
}

type Listener = (event: SystemEventSummary) => void;

class ActivityBroadcaster {
  private readonly listeners = new Set<Listener>();

  // postgres.js .listen() opens a dedicated connection that survives the
  // pool. We hold the original promise so concurrent callers wait on the
  // same handshake instead of opening duplicate listeners.
  private startPromise: Promise<void> | null = null;

  start(): Promise<void> {
    if (!this.startPromise) {
      this.startPromise = sql
        .listen('activity_stream', (payload) => this.dispatch(payload))
        .then(() => undefined)
        .catch((err) => {
          // Clear so the next caller retries instead of reusing a poisoned
          // promise — handy when Postgres is briefly unavailable at boot.
          this.startPromise = null;
          throw err;
        });
    }
    return this.startPromise;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  size(): number {
    return this.listeners.size;
  }

  private dispatch(payload: string): void {
    let event: SystemEventSummary;
    try {
      event = JSON.parse(payload) as SystemEventSummary;
    } catch (err) {
      console.error('[activity-broadcaster] invalid payload:', err);
      return;
    }
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        // One bad listener shouldn't poison the rest of the fan-out.
        console.error('[activity-broadcaster] listener threw:', err);
      }
    }
  }
}

export const activityBroadcaster = new ActivityBroadcaster();
