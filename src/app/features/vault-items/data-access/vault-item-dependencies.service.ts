// NOTE: The /vault-item-dependencies endpoint does not yet exist in jimbo-api (Hono + SQLite on VPS).
// This service scaffolds the pattern so the frontend is ready when the backend catches up.
//
// Dependency rows are always scoped to a blocked_id — no global query.
// Consumers call loadFor(id) explicitly; the service never auto-fetches in its constructor.

import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import type { VaultItemDependency } from '../../../domain/vault/vault-item-dependency';
import type { VaultItemId } from '../../../domain/ids';
import type { OpenBlocker } from '../../../domain/vault/readiness';
import { environment } from '../../../../environments/environment';
import { VaultItemsService } from './vault-items.service';
import { isSeedMode } from '../../../shared/seed-mode';
import { SEED } from '../../../domain/seed';

@Injectable({ providedIn: 'root' })
export class VaultItemDependenciesService {
  private readonly http = inject(HttpClient);
  private readonly vaultItemsService = inject(VaultItemsService);
  private readonly url = `${environment.apiUrl}/vault-item-dependencies`;

  // Keyed by blocked_id string. Lazy-populated via loadFor().
  private readonly _depsByItem = signal<Record<string, VaultItemDependency[]>>({});

  // Returns open blockers (not yet completed) for a given vault item, hydrated with
  // seq and title from the vault items signal. This is a two-signal computed so it
  // updates when either deps or the vault items list changes.
  blockersFor(vaultItemId: VaultItemId) {
    return computed((): OpenBlocker[] => {
      const deps = this._depsByItem()[vaultItemId] ?? [];
      const result: OpenBlocker[] = [];
      for (const dep of deps) {
        const blocker = this.vaultItemsService.getById(dep.blocker_id);
        // Open = blocker item exists and is not yet completed.
        if (!blocker || blocker.completed_at !== null) continue;
        result.push({
          blocker_id: dep.blocker_id as string,
          blocker_seq: blocker.seq,
          blocker_title: blocker.title,
        });
      }
      return result;
    });
  }

  loadFor(vaultItemId: VaultItemId): void {
    if (isSeedMode()) {
      const data = SEED.vault_item_dependencies.filter(d => d.blocked_id === vaultItemId);
      this._depsByItem.update(map => ({ ...map, [vaultItemId]: [...data] }));
      return;
    }
    const params = new HttpParams().set('blocked_id', `eq.${vaultItemId}`);
    this.http.get<VaultItemDependency[]>(this.url, { params }).subscribe({
      next: data => this._depsByItem.update(map => ({ ...map, [vaultItemId]: data })),
      // Silently swallow errors — endpoint doesn't exist yet; empty state is the correct fallback.
      error: () => this._depsByItem.update(map => ({ ...map, [vaultItemId]: [] })),
    });
  }

  // Optimistic insert — adds dependency row locally, then POSTs to server.
  add(blockerId: VaultItemId, blockedId: VaultItemId): void {
    const now = new Date().toISOString();
    const row: VaultItemDependency = { blocker_id: blockerId, blocked_id: blockedId, created_at: now };
    this._depsByItem.update(map => ({
      ...map,
      [blockedId]: [...(map[blockedId] ?? []), row],
    }));
    this.http.post<VaultItemDependency>(this.url, { blocker_id: blockerId, blocked_id: blockedId }).subscribe({
      error: () => this._depsByItem.update(map => ({
        ...map,
        [blockedId]: (map[blockedId] ?? []).filter(r => r.blocker_id !== blockerId),
      })),
    });
  }

  // Optimistic delete — removes dependency row locally, then DELETEs on server.
  remove(blockerId: VaultItemId, blockedId: VaultItemId): void {
    const prior = this._depsByItem()[blockedId] ?? [];
    this._depsByItem.update(map => ({
      ...map,
      [blockedId]: prior.filter(r => r.blocker_id !== blockerId),
    }));
    const params = new HttpParams()
      .set('blocker_id', `eq.${blockerId}`)
      .set('blocked_id', `eq.${blockedId}`);
    this.http.delete(this.url, { params }).subscribe({
      error: () => this._depsByItem.update(map => ({ ...map, [blockedId]: prior })),
    });
  }
}
