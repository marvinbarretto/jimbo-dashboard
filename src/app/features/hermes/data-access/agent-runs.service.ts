import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export type AgentRunOutcome =
  | 'CREDIT_402'
  | 'QUOTA_403'
  | 'AUTH_403'
  | 'AUTH_ERR'
  | 'RATE_429'
  | 'UPSTREAM_5XX'
  | 'API_FAIL'
  | 'POLL_NO_WORK'
  | 'POLL_CORRUPTED'
  | 'PROSE_RESPONSE';

export interface AgentRunRollupRow {
  job_name: string;
  model: string | null;
  outcome: AgentRunOutcome;
  count: number;
  avg_duration_ms: number | null;
  last_ts: string;
}

export interface AgentRunTailRow {
  ts: string;
  job_name: string;
  model: string | null;
  duration_ms: number | null;
  outcome: AgentRunOutcome;
  title: string;
  session_id: string | null;
}

@Injectable({ providedIn: 'root' })
export class AgentRunsService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.dashboardApiUrl;

  rollup(opts: { days?: number; since?: string; until?: string } = {}): Observable<{ items: AgentRunRollupRow[] }> {
    const params = new URLSearchParams();
    if (opts.since) params.set('since', opts.since);
    if (opts.until) params.set('until', opts.until);
    if (!opts.since) params.set('days', String(opts.days ?? 7));
    return this.http.get<{ items: AgentRunRollupRow[] }>(
      `${this.base}/api/agent-runs/rollup?${params.toString()}`,
    );
  }

  tail(limit = 50): Observable<{ items: AgentRunTailRow[] }> {
    return this.http.get<{ items: AgentRunTailRow[] }>(
      `${this.base}/api/agent-runs/tail?limit=${limit}`,
    );
  }
}
