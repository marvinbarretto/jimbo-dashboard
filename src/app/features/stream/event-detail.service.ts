import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

// Full event including detail + payload — what /api/events/:id returns.
// Distinct from SystemEventSummary (live broadcast) which omits these.
export interface SystemEventFull {
  id: number;
  ts: string;
  source: string;
  kind: string;
  actor: string | null;
  title: string;
  detail: unknown;
  payload: unknown;
  ref_type: string | null;
  ref_id: string | null;
  correlation_id: string | null;
  level: string;
}

interface CacheEntry {
  state: 'loading' | 'loaded' | 'error';
  event?: SystemEventFull;
  error?: string;
}

// Per-id cache. Avoids hammering /api/events/:id when the same row is
// expanded twice. Cache size cap prevents long-running tabs from leaking
// — at 256 entries we drop the oldest quartile, same shape as the
// hermes plugin's tool_call map.
const MAX_CACHE = 256;

@Injectable({ providedIn: 'root' })
export class EventDetailService {
  private readonly http = inject(HttpClient);

  private readonly cache = new Map<number, CacheEntry>();
  private readonly _version = signal(0);

  // Invalidation tick — bumped on every cache mutation so callers can
  // build computed signals over `entry(id)` and re-run when the cache
  // changes. Cheaper than per-id signals for a use case where rows
  // expand/contract one at a time.
  readonly version = this._version.asReadonly();

  entry(id: number): CacheEntry | undefined {
    // Read version() to register dependency; stays out of caller code.
    this._version();
    return this.cache.get(id);
  }

  async load(id: number): Promise<void> {
    const existing = this.cache.get(id);
    if (existing && existing.state !== 'error') return;

    this.set(id, { state: 'loading' });

    try {
      const event = await firstValueFrom(
        this.http.get<SystemEventFull>(`${environment.dashboardApiUrl}/api/events/${id}`),
      );
      this.set(id, { state: 'loaded', event });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'fetch failed';
      this.set(id, { state: 'error', error: message });
    }
  }

  private set(id: number, entry: CacheEntry): void {
    if (this.cache.size >= MAX_CACHE && !this.cache.has(id)) {
      // Drop oldest quartile by insertion order — Map iterates in order.
      let n = MAX_CACHE / 4;
      for (const k of this.cache.keys()) {
        if (n-- <= 0) break;
        this.cache.delete(k);
      }
    }
    this.cache.set(id, entry);
    this._version.update((v) => v + 1);
  }
}
