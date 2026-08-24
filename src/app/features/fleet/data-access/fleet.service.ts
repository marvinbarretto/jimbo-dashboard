// Polls GET /api/dispatch/stats (jimbo-api) every 30s — the fleet
// observability aggregate from boris-v2 slice 6. Same poll shape as
// triage-activity.service.ts (setInterval + DestroyRef teardown), same
// Zod-at-the-boundary validation as actors.service.ts.

import { HttpClient } from '@angular/common/http';
import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiFleetStatsSchema, failureToNotification, type ApiFleetStats, type FleetFailure } from '@domain/dispatch';
import type { NotificationEntry } from '@shared/components/notification-bar/notification-bar';
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

  // Repeat failures on the same note (a grooming retry loop, a briefing
  // that fails every run) would otherwise flood the bar with one row per
  // attempt — group by note (falling back to task_id for failures with no
  // note) so the bar shows one row per underlying problem. failures_24h
  // arrives completed_at DESC, so each group's first member is the latest.
  private readonly failureGroups = computed<ReadonlyMap<string, readonly FleetFailure[]>>(() => {
    const groups = new Map<string, FleetFailure[]>();
    for (const f of this.failures()) {
      if (f.dismissed_at) continue;
      const key = f.note_title ?? f.task_id;
      const group = groups.get(key);
      if (group) group.push(f);
      else groups.set(key, [f]);
    }
    return groups;
  });

  // Site-wide notification bar feed. Lives here (not in the bar itself)
  // because it's the same 24h feed fleet-board already reads; the bar is just
  // another consumer that additionally filters on dismissed_at and groups.
  readonly notifications = computed<readonly NotificationEntry[]>(() =>
    [...this.failureGroups().values()]
      .map(group => failureToNotification(group[0], group.length)));

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

  // Optimistic: the bar removes the row immediately (via the notifications
  // filter above), then persists. Rolled back on failure so a dropped request
  // doesn't leave the server thinking something was acknowledged that wasn't
  // — the 30s poll would otherwise silently resurrect it anyway, which reads
  // as a bug rather than as "the dismiss didn't take". `id` is the entry's
  // (most recent) failure id; every failure grouped under the same note gets
  // dismissed alongside it, or the older retries would just resurface as a
  // "new" notification once the latest one is gone.
  async dismiss(id: string): Promise<void> {
    const previous = this._stats();
    if (!previous) return;

    const group = [...this.failureGroups().values()].find(g => g[0].id === id);
    const ids = group ? group.map(f => f.id) : [id];

    const now = new Date().toISOString();
    this._stats.set({
      ...previous,
      failures_24h: previous.failures_24h.map(f => (ids.includes(f.id) ? { ...f, dismissed_at: now } : f)),
    });

    try {
      await Promise.all(ids.map(fid =>
        firstValueFrom(this.http.post(`${environment.dashboardApiUrl}/api/dispatch/${fid}/dismiss`, {}))));
    } catch {
      this._stats.set(previous);
      this.toast.error('Could not dismiss — try again');
    }
  }

  // "Dismiss all" gesture from the bar — one dismiss() per visible (already
  // grouped) entry, so each still clears its whole retry group.
  async dismissAll(): Promise<void> {
    await Promise.all(this.notifications().map(entry => this.dismiss(entry.id)));
  }
}
