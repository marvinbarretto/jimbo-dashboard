// NOTE: The /dispatch-queue endpoint exists in jimbo-api (Hono + SQLite on VPS),
// populated by hermes's pipeline-pump cron. The dashboard is read-mostly here —
// the only mutation is operator-triggered retry of a failed dispatch.

import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import type { DispatchQueueEntry } from '@domain/dispatch';
import type { DispatchId, VaultItemId } from '@domain/ids';
import { environment } from '../../../../environments/environment';
import { isSeedMode } from '@shared/seed-mode';
import { SEED } from '@domain/seed';

@Injectable({ providedIn: 'root' })
export class DispatchService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/dispatch-queue`;

  private readonly _entries = signal<DispatchQueueEntry[]>([]);
  private readonly _loading = signal(true);

  readonly entries  = this._entries.asReadonly();
  readonly isLoading = this._loading.asReadonly();

  constructor() { this.load(); }

  private load(): void {
    if (isSeedMode()) {
      this._entries.set([...SEED.dispatch_entries]);
      this._loading.set(false);
      return;
    }
    this.http.get<DispatchQueueEntry[]>(`${this.url}?order=created_at.desc`).subscribe({
      next: data => { this._entries.set(data); this._loading.set(false); },
      error: ()   => this._loading.set(false),
    });
  }

  getById(id: DispatchId): DispatchQueueEntry | undefined {
    return this._entries().find(e => e.id === id);
  }

  // All dispatches for a given vault item, newest first. Used by vault-item-detail
  // to show the dispatch history alongside the activity log.
  forTask(taskId: VaultItemId) {
    return computed(() =>
      this._entries()
        .filter(e => e.task_id === taskId)
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    );
  }

  // Operator-triggered retry of a failed dispatch. Flips status back to 'approved',
  // clears the error, increments retry_count. Production may prefer a new row per
  // attempt to preserve full history; we mutate in place here for simplicity.
  retry(id: DispatchId): void {
    const prior = this.getById(id);
    if (!prior || prior.status !== 'failed') return;
    const optimistic: DispatchQueueEntry = {
      ...prior,
      status: 'approved',
      error: null,
      started_at: null,
      completed_at: null,
      retry_count: prior.retry_count + 1,
    };
    this._entries.update(es => es.map(e => e.id === id ? optimistic : e));

    if (isSeedMode()) return;

    const params = new HttpParams().set('id', `eq.${id}`);
    const patch = {
      status:       'approved' as const,
      error:        null,
      started_at:   null,
      completed_at: null,
      retry_count:  prior.retry_count + 1,
    };
    this.http.patch<DispatchQueueEntry[]>(this.url, patch, { params, headers: { Prefer: 'return=representation' } })
      .subscribe({
        next: ([updated]) => this._entries.update(es => es.map(e => e.id === id ? updated : e)),
        error: ()          => this._entries.update(es => es.map(e => e.id === id ? prior : e)),
      });
  }
}
