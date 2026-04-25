// NOTE: The /activity-events endpoint does not yet exist in jimbo-api (Hono + SQLite on VPS).
// This service scaffolds the pattern so the frontend is ready when the backend catches up.
//
// Vault-scoped events only. Project-side events live in ProjectActivityEventsService.

import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import type { ActivityEvent, VaultActivityEvent } from '../../../domain/activity/activity-event';
import { isVaultEvent } from '../../../domain/activity/activity-event';
import type { VaultItemId } from '../../../domain/ids';
import { activityId } from '../../../domain/ids';
import { environment } from '../../../../environments/environment';
import { isSeedMode } from '../../../shared/seed-mode';
import { SEED } from '../../../domain/seed';

// `Omit<Union, K>` collapses to common keys; this version distributes over union members
// so each variant of VaultActivityEvent loses 'id' and 'at' independently.
type CreatePayload<T> = T extends unknown ? Omit<T, 'id' | 'at'> : never;
type EventPayload = CreatePayload<VaultActivityEvent>;

@Injectable({ providedIn: 'root' })
export class ActivityEventsService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/activity-events`;

  // Keyed by vault_item_id string. Lazy-populated via loadFor().
  private readonly _eventsByItem = signal<Record<string, VaultActivityEvent[]>>({});

  // Returns a computed sorted-desc timeline scoped to this vault item.
  // Callers must invoke inside their own computed() so the vaultItemId input drives reactivity.
  eventsFor(vaultItemId: VaultItemId) {
    return computed(() => {
      const events = this._eventsByItem()[vaultItemId] ?? [];
      // Most-recent first so the activity log reads top = latest.
      return [...events].sort((a, b) => b.at.localeCompare(a.at));
    });
  }

  loadFor(vaultItemId: VaultItemId): void {
    if (isSeedMode()) {
      // Widen from the as-const tuple so the type predicate narrows correctly.
      const all = SEED.activity_events as readonly ActivityEvent[];
      const data: VaultActivityEvent[] = all.filter(isVaultEvent).filter(e => e.vault_item_id === vaultItemId);
      this._eventsByItem.update(map => ({ ...map, [vaultItemId]: [...data] }));
      return;
    }
    const params = new HttpParams()
      .set('vault_item_id', `eq.${vaultItemId}`)
      .set('order', 'at.desc');
    this.http.get<VaultActivityEvent[]>(this.url, { params }).subscribe({
      next: data => this._eventsByItem.update(map => ({ ...map, [vaultItemId]: data })),
      // Silently swallow errors — endpoint doesn't exist yet; empty state is the correct fallback.
      error: () => this._eventsByItem.update(map => ({ ...map, [vaultItemId]: [] })),
    });
  }

  // Optimistic insert — emits the event locally immediately and fires POST.
  // If the POST fails, the optimistic row stays: reverting an event is more confusing to
  // the operator than a stale entry, especially when the backing row write succeeded.
  post(event: EventPayload): void {
    const now = new Date().toISOString();
    const tempId = activityId(crypto.randomUUID());
    const optimistic = { ...event, id: tempId, at: now } as VaultActivityEvent;
    const key = event.vault_item_id;

    this._eventsByItem.update(map => ({
      ...map,
      [key]: [...(map[key] ?? []), optimistic],
    }));

    if (isSeedMode()) return;

    this.http.post<VaultActivityEvent>(this.url, optimistic).subscribe({
      // Reconcile the temp id with the server-assigned one.
      next: saved => this._eventsByItem.update(map => ({
        ...map,
        [key]: (map[key] ?? []).map(e => e.id === tempId ? saved : e),
      })),
      // Leave the optimistic row — see comment above.
      error: () => {},
    });
  }
}
