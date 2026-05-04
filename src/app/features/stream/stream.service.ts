import { Injectable, signal } from '@angular/core';
import { environment } from '../../../environments/environment';

// Mirrors the dashboard-api SystemEventSummary shape (see
// api/services/activity-broadcaster.ts). `detail` and `payload` are
// intentionally NOT in the live stream — fetch via /api/events/:id when
// the user expands a row.
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

interface HydrateMessage {
  type: 'hydrate';
  events: SystemEventSummary[];
}

interface EventMessage {
  type: 'event';
  event: SystemEventSummary;
}

type StreamMessage = HydrateMessage | EventMessage;

export type ConnectionStatus = 'idle' | 'connecting' | 'open' | 'closed';

const MAX_EVENTS = 1000;
const INITIAL_RETRY_MS = 1000;
const MAX_RETRY_MS = 30_000;

@Injectable({ providedIn: 'root' })
export class StreamService {
  private ws: WebSocket | null = null;
  private retryDelay = INITIAL_RETRY_MS;
  private retryHandle: ReturnType<typeof setTimeout> | null = null;
  private explicitlyClosed = false;

  private readonly _events = signal<SystemEventSummary[]>([]);
  private readonly _status = signal<ConnectionStatus>('idle');
  private readonly _lastError = signal<string | null>(null);

  readonly events = this._events.asReadonly();
  readonly status = this._status.asReadonly();
  readonly lastError = this._lastError.asReadonly();

  connect(): void {
    if (this.ws) return;
    this.explicitlyClosed = false;
    this.openSocket();
  }

  disconnect(): void {
    this.explicitlyClosed = true;
    if (this.retryHandle !== null) {
      clearTimeout(this.retryHandle);
      this.retryHandle = null;
    }
    this.ws?.close(1000, 'client disconnect');
    this.ws = null;
    this._status.set('idle');
  }

  private openSocket(): void {
    this._status.set('connecting');
    // Caddy basic_auth gates the WS upgrade; the browser includes the
    // credential automatically. No query param, no app-level token.
    const url = this.computeWsUrl();
    const ws = new WebSocket(url);
    this.ws = ws;

    ws.onopen = () => {
      this._status.set('open');
      this._lastError.set(null);
      this.retryDelay = INITIAL_RETRY_MS;
    };

    ws.onmessage = (evt) => {
      let msg: StreamMessage;
      try {
        msg = JSON.parse(evt.data) as StreamMessage;
      } catch {
        return;
      }
      if (msg.type === 'hydrate') {
        this._events.set(msg.events);
      } else if (msg.type === 'event') {
        // Append + cap. Newest at the end of the array; UI reverses.
        this._events.update((prev) => {
          const next = [...prev, msg.event];
          return next.length > MAX_EVENTS ? next.slice(next.length - MAX_EVENTS) : next;
        });
      }
    };

    ws.onerror = () => {
      this._lastError.set('WebSocket error');
    };

    ws.onclose = (evt) => {
      this._status.set('closed');
      this.ws = null;
      if (this.explicitlyClosed) return;
      const delay = this.retryDelay;
      this.retryDelay = Math.min(this.retryDelay * 2, MAX_RETRY_MS);
      this._lastError.set(`disconnected (${evt.code}); retrying in ${delay}ms`);
      this.retryHandle = setTimeout(() => {
        this.retryHandle = null;
        if (!this.explicitlyClosed) this.openSocket();
      }, delay);
    };
  }

  // dashboardApiUrl is normally relative ("/dashboard-api") — convert to a
  // ws/wss URL anchored at window.location. Falls back to absolute conversion
  // if a future deploy ever sets an absolute http(s) URL.
  private computeWsUrl(): string {
    const base = environment.dashboardApiUrl;
    if (base.startsWith('/')) {
      const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
      return `${proto}://${window.location.host}${base}/ws/stream`;
    }
    return base.replace(/^http/, 'ws') + '/ws/stream';
  }
}
