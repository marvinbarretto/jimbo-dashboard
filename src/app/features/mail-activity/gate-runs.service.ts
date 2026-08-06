import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import type { EmailReport } from './mail-activity.service';

/** Mirrors GateRun in jimbo-api/routes/emails.ts. */
export interface GateRun {
  run_id: string;
  started_at: string;
  ended_at: string;
  actor_id: string | null;
  models: string[];
  total: number;
  kept: number;
  /** How many reached a vault note. `kept - filed` is silent loss. */
  filed: number;
  by_verdict: Record<string, number>;
}

@Injectable({ providedIn: 'root' })
export class GateRunsService {
  private readonly http = inject(HttpClient);

  readonly runs = signal<GateRun[]>([]);
  readonly loading = signal(false);
  readonly lastError = signal<string | null>(null);

  /** Decisions are fetched per run on expand and cached — a run is immutable
   *  once gated, so there is nothing to invalidate. */
  private readonly decisionCache = new Map<string, EmailReport[]>();
  readonly decisions = signal<EmailReport[]>([]);
  readonly decisionsLoading = signal(false);

  async load(limit = 40): Promise<void> {
    this.loading.set(true);
    this.lastError.set(null);
    try {
      const res = await firstValueFrom(
        this.http.get<{ items: GateRun[] }>(`/api/emails/reports/runs?limit=${limit}`),
      );
      this.runs.set(res.items);
    } catch (err: unknown) {
      this.lastError.set(err instanceof Error ? err.message : 'Failed to load runs');
    } finally {
      this.loading.set(false);
    }
  }

  async loadDecisions(runId: string): Promise<void> {
    const cached = this.decisionCache.get(runId);
    if (cached) {
      this.decisions.set(cached);
      return;
    }
    this.decisionsLoading.set(true);
    this.decisions.set([]);
    try {
      const res = await firstValueFrom(
        this.http.get<{ items: EmailReport[] }>(
          `/api/emails/reports/runs/${encodeURIComponent(runId)}/decisions`,
        ),
      );
      this.decisionCache.set(runId, res.items);
      this.decisions.set(res.items);
    } catch (err: unknown) {
      this.lastError.set(err instanceof Error ? err.message : 'Failed to load decisions');
    } finally {
      this.decisionsLoading.set(false);
    }
  }
}
