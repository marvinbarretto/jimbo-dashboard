// Polls GET /api/dispatch/stats (jimbo-api) every 30s — the fleet
// observability aggregate from boris-v2 slice 6. Same poll shape as
// triage-activity.service.ts (setInterval + DestroyRef teardown), same
// Zod-at-the-boundary validation as actors.service.ts.

import { HttpClient } from '@angular/common/http';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiFleetStatsSchema, type ApiFleetStats } from '@domain/dispatch';
import { environment } from '../../../../environments/environment';
import { ToastService } from '@shared/components/toast/toast.service';

const REFRESH_INTERVAL_MS = 30_000;

@Injectable({ providedIn: 'root' })
export class FleetService {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly url = `${environment.dashboardApiUrl}/api/dispatch/stats`;

  private readonly _stats = signal<ApiFleetStats | null>(null);
  private readonly _loading = signal(false);
  private readonly _lastError = signal<string | null>(null);
  private readonly _lastFetch = signal<string | null>(null);

  readonly stats = this._stats.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly lastError = this._lastError.asReadonly();
  readonly lastFetch = this._lastFetch.asReadonly();

  readonly queue = computed(() => this._stats()?.queue ?? []);
  readonly workers = computed(() => this._stats()?.workers ?? []);
  readonly recent = computed(() => this._stats()?.recent ?? []);
  readonly burn = computed(() => this._stats()?.burn_5h ?? []);
  readonly folds = computed(() => this._stats()?.folds ?? []);
  readonly now = computed(() => this._stats()?.now ?? []);
  readonly failures = computed(() => this._stats()?.failures_24h ?? []);
  readonly stuckNotes = computed(() => this._stats()?.stuck_notes ?? []);
  readonly lastPipelineEnqueueAt = computed(() => this._stats()?.last_pipeline_enqueue_at ?? null);

  private timerHandle: ReturnType<typeof setInterval> | null = null;
  private started = false;

  start(): void {
    if (this.started) return;
    this.started = true;
    void this.refresh();
    this.timerHandle = setInterval(() => void this.refresh(), REFRESH_INTERVAL_MS);
    // Tear down if the consumer's DestroyRef fires.
    inject(DestroyRef).onDestroy(() => this.stop());
  }

  stop(): void {
    if (this.timerHandle !== null) {
      clearInterval(this.timerHandle);
      this.timerHandle = null;
    }
    this.started = false;
  }

  async refresh(): Promise<void> {
    this._loading.set(true);
    this._lastError.set(null);
    try {
      const raw = await firstValueFrom(this.http.get<unknown>(this.url));
      const result = ApiFleetStatsSchema.safeParse(raw);
      if (!result.success) {
        console.error('[fleet] /api/dispatch/stats response failed schema:', result.error.issues);
        this._lastError.set('API response did not match expected shape');
        this.toast.error('Fleet stats malformed — API response did not match expected shape');
        return;
      }
      this._stats.set(result.data);
      this._lastFetch.set(new Date().toISOString());
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'fetch failed';
      this._lastError.set(msg);
    } finally {
      this._loading.set(false);
    }
  }
}
