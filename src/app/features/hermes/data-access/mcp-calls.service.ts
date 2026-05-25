import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface McpCallRollupRow {
  tool: string;
  count: number;
  success_count: number;
  error_count: number;
  avg_duration_ms: number;
  p95_duration_ms: number;
  last_ts: string;
}

export interface McpCallTailRow {
  ts: string;
  tool: string;
  caller: string | null;
  duration_ms: number;
  success: boolean;
  error_message: string | null;
  args: Record<string, unknown> | null;
}

@Injectable({ providedIn: 'root' })
export class McpCallsService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.dashboardApiUrl;

  rollup(opts: { days?: number; since?: string; until?: string } = {}): Observable<{ items: McpCallRollupRow[] }> {
    const params = new URLSearchParams();
    if (opts.since) params.set('since', opts.since);
    if (opts.until) params.set('until', opts.until);
    if (!opts.since) params.set('days', String(opts.days ?? 7));
    return this.http.get<{ items: McpCallRollupRow[] }>(
      `${this.base}/api/mcp-calls/rollup?${params.toString()}`,
    );
  }

  tail(opts: { limit?: number; since?: string; until?: string } = {}): Observable<{ items: McpCallTailRow[] }> {
    const params = new URLSearchParams();
    params.set('limit', String(opts.limit ?? 50));
    if (opts.since) params.set('since', opts.since);
    if (opts.until) params.set('until', opts.until);
    return this.http.get<{ items: McpCallTailRow[] }>(
      `${this.base}/api/mcp-calls/tail?${params.toString()}`,
    );
  }
}
