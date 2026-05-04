import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { SystemEventFull } from './event-detail.service';

// Aggregation row — one entry per distinct error class. Class key is the
// first 80 chars of the *compacted* payload.error (the plugin caps this
// at the source, but historic rows from before that change still carry
// full tracebacks; we re-compact here so display + grouping match).
const CLASS_KEY_LIMIT = 80;
const LABEL_LIMIT = 200;

// Mirror of the server's _compact_error: take the last line of a
// Python traceback, the first line of anything else, and cap at
// LABEL_LIMIT. Forward-emitted events already arrive compacted, but
// rows in the table from before the cap shipped still need it.
function compactError(s: string): string {
  if (!s) return s;
  const lines = s.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  if (lines.length === 0) return '';
  const line = lines[0]!.startsWith('Traceback') ? lines[lines.length - 1]! : lines[0]!;
  return line.length > LABEL_LIMIT ? line.slice(0, LABEL_LIMIT - 1) + '…' : line;
}

// How many recent events to fetch for aggregation. The list endpoint
// already filters server-side by level. 500 covers a few hours of
// activity at current rates.
const FETCH_LIMIT = 500;

// Auto-refresh cadence. Fast enough to feel live, slow enough that we
// aren't hammering the API. Manual refresh button is available too.
const REFRESH_INTERVAL_MS = 30_000;

export interface ErrorClass {
  // Group key — first 80 chars of payload.error, used for grouping/sort.
  key: string;
  // Human-readable label — same as key for now, but distinct so we can
  // later derive a friendlier display from key + sample (e.g. strip
  // request_ids that don't survive grouping but might be useful inline).
  label: string;
  count: number;
  // Most recent occurrence — ISO. Drives "5m ago" display + sort.
  lastTs: string;
  // Most recent event id — caller can link to expand it in the stream.
  sampleEventId: number;
  // Most recent correlation_id, if present — caller can use to filter
  // the stream to the failing thread.
  sampleCorrelationId: string | null;
}

interface ListResponse {
  items: SystemEventFull[];
  next_cursor: string | null;
}

@Injectable({ providedIn: 'root' })
export class ErrorAggregationService {
  private readonly http = inject(HttpClient);

  private readonly _classes = signal<ErrorClass[]>([]);
  private readonly _loading = signal(false);
  private readonly _lastFetch = signal<string | null>(null);
  private readonly _lastError = signal<string | null>(null);

  readonly classes = this._classes.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly lastFetch = this._lastFetch.asReadonly();
  readonly lastError = this._lastError.asReadonly();

  // Derived: total error events across all classes (sum of counts).
  readonly totalErrors = computed(() =>
    this._classes().reduce((acc, c) => acc + c.count, 0),
  );

  private timerHandle: ReturnType<typeof setInterval> | null = null;

  // Idempotent — safe to call multiple times. Starts the auto-refresh
  // timer + kicks off an immediate fetch.
  start(): void {
    if (this.timerHandle !== null) return;
    void this.refresh();
    this.timerHandle = setInterval(() => void this.refresh(), REFRESH_INTERVAL_MS);
  }

  stop(): void {
    if (this.timerHandle !== null) {
      clearInterval(this.timerHandle);
      this.timerHandle = null;
    }
  }

  async refresh(): Promise<void> {
    this._loading.set(true);
    this._lastError.set(null);
    try {
      const response = await firstValueFrom(
        this.http.get<ListResponse>(
          `${environment.dashboardApiUrl}/api/events?level=warn&limit=${FETCH_LIMIT}`,
        ),
      );
      const aggregated = this.aggregate(response.items);
      this._classes.set(aggregated);
      this._lastFetch.set(new Date().toISOString());
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'fetch failed';
      this._lastError.set(msg);
    } finally {
      this._loading.set(false);
    }
  }

  private aggregate(events: SystemEventFull[]): ErrorClass[] {
    const groups = new Map<string, ErrorClass>();
    for (const ev of events) {
      const rawErr = this.extractErrorString(ev.payload);
      if (!rawErr) continue;
      const errStr = compactError(rawErr);
      const key = errStr.slice(0, CLASS_KEY_LIMIT);
      const existing = groups.get(key);
      if (existing) {
        existing.count++;
        // Keep the most recent ts/id/cid as the sample. Events come
        // back newest-first from the API, so the FIRST occurrence we
        // see for a key is already the most recent — but be defensive.
        if (ev.ts > existing.lastTs) {
          existing.lastTs = ev.ts;
          existing.sampleEventId = ev.id;
          existing.sampleCorrelationId = ev.correlation_id;
        }
      } else {
        groups.set(key, {
          key,
          label: errStr,
          count: 1,
          lastTs: ev.ts,
          sampleEventId: ev.id,
          sampleCorrelationId: ev.correlation_id,
        });
      }
    }
    // Sort by count desc, then lastTs desc — frequent + fresh first.
    return [...groups.values()].sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return b.lastTs.localeCompare(a.lastTs);
    });
  }

  private extractErrorString(payload: unknown): string | null {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
    const p = payload as Record<string, unknown>;
    const err = p['error'];
    if (typeof err === 'string' && err.length > 0) return err;
    return null;
  }
}
