import { Injectable, signal } from '@angular/core';
import { environment } from '../../../environments/environment';

// Mirrors jimbo-api SystemEventSummary. `detail` and `payload` are
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

export type ConnectionStatus = 'idle' | 'connecting' | 'open' | 'closed';

const MAX_EVENTS = 1000;

@Injectable({ providedIn: 'root' })
export class StreamService {
  private es: EventSource | null = null;
  private explicitlyClosed = false;

  private readonly _events = signal<SystemEventSummary[]>([]);
  private readonly _status = signal<ConnectionStatus>('idle');
  private readonly _lastError = signal<string | null>(null);

  readonly events = this._events.asReadonly();
  readonly status = this._status.asReadonly();
  readonly lastError = this._lastError.asReadonly();

  connect(): void {
    if (this.es) return;
    this.explicitlyClosed = false;
    this.openSource();
  }

  disconnect(): void {
    this.explicitlyClosed = true;
    this.es?.close();
    this.es = null;
    this._status.set('idle');
  }

  private openSource(): void {
    this._status.set('connecting');
    const es = new EventSource(environment.streamUrl);
    this.es = es;

    es.onopen = () => {
      this._status.set('open');
      this._lastError.set(null);
    };

    es.addEventListener('hydrate', (evt: MessageEvent) => {
      try {
        this._events.set(JSON.parse(evt.data) as SystemEventSummary[]);
      } catch { /* ignore */ }
    });

    es.addEventListener('live', (evt: MessageEvent) => {
      try {
        const event = JSON.parse(evt.data) as SystemEventSummary;
        this._events.update((prev) => {
          const next = [...prev, event];
          return next.length > MAX_EVENTS ? next.slice(next.length - MAX_EVENTS) : next;
        });
      } catch { /* ignore */ }
    });

    es.onerror = () => {
      if (this.explicitlyClosed) return;
      this._status.set('closed');
      this._lastError.set('Stream disconnected; browser will retry automatically');
      // EventSource auto-reconnects — onopen fires again when back up
    };
  }
}
