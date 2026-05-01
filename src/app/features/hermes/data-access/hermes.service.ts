import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Observable, catchError, map, of, shareReplay, switchMap, timer } from 'rxjs';
import { environment } from '../../../../environments/environment';
import type { HermesJob, HermesSnapshot } from '../hermes.types';
export type { HermesJob };

interface SnapshotState {
  data: HermesSnapshot | null;
  error: string | null;
}

@Injectable({ providedIn: 'root' })
export class HermesService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.dashboardApiUrl;

  private readonly state$ = timer(0, 10_000).pipe(
    switchMap(() =>
      this.http.get<HermesSnapshot>(`${this.base}/api/hermes/jobs`).pipe(
        map((data): SnapshotState => ({ data, error: null })),
        catchError((err): Observable<SnapshotState> => {
          const msg = err instanceof Error ? err.message : 'Request failed';
          return of({ data: null, error: msg });
        })
      )
    ),
    shareReplay(1)
  );

  readonly snapshot = toSignal(this.state$.pipe(map(s => s.data)), { initialValue: null });
  readonly loadError = toSignal(this.state$.pipe(map(s => s.error)), { initialValue: null });

  readonly jobs = computed(() => this.snapshot()?.jobs ?? []);
  readonly total = computed(() => this.snapshot()?.total ?? 0);
  readonly activeCount = computed(() => this.jobs().filter(j => j.state === 'scheduled' || j.state === 'running').length);
  readonly pausedCount = computed(() => this.snapshot()?.paused_count ?? 0);
  readonly failingCount = computed(() => this.snapshot()?.failing_count ?? 0);
  readonly runningJobs = computed(() => this.jobs().filter(j => j.state === 'running'));
  readonly lastSync = computed(() => this.snapshot()?.read_at ?? null);

  readonly nextFiringJob = computed((): HermesJob | null => {
    const now = Date.now();
    return this.jobs()
      .filter(j => j.next_run_at && new Date(j.next_run_at).getTime() > now)
      .sort((a, b) => new Date(a.next_run_at!).getTime() - new Date(b.next_run_at!).getTime())[0] ?? null;
  });

  readonly recentRuns = computed((): HermesJob[] =>
    [...this.jobs()]
      .filter(j => j.last_run_at)
      .sort((a, b) => new Date(b.last_run_at!).getTime() - new Date(a.last_run_at!).getTime())
      .slice(0, 8)
  );

  trigger(jobId: string): Observable<{ triggered: string }> {
    return this.http.post<{ triggered: string }>(`${this.base}/api/hermes/trigger/${jobId}`, {});
  }

  pause(jobId: string): Observable<{ ok: true; jobId: string }> {
    return this.http.post<{ ok: true; jobId: string }>(`${this.base}/api/hermes/pause/${jobId}`, {});
  }

  resume(jobId: string): Observable<{ ok: true; jobId: string }> {
    return this.http.post<{ ok: true; jobId: string }>(`${this.base}/api/hermes/resume/${jobId}`, {});
  }

  remove(jobId: string): Observable<{ ok: true; jobId: string }> {
    return this.http.delete<{ ok: true; jobId: string }>(`${this.base}/api/hermes/${jobId}`);
  }

  update(jobId: string, patch: { name?: string; schedule_display?: string }): Observable<HermesJob> {
    return this.http.patch<HermesJob>(`${this.base}/api/hermes/${jobId}`, patch);
  }
}
