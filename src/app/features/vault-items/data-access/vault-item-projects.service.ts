// NOTE: The /vault-item-projects endpoint does not yet exist in jimbo-api (Hono + SQLite on VPS).
// This service scaffolds the pattern so the frontend is ready when the backend catches up.
//
// Junction rows are always scoped to a vault_item_id — no global query.
// Consumers call loadFor(id) explicitly; the service never auto-fetches in its constructor.
//
// TODO: junction mutations (add/remove) do not emit activity events.
// A future `project_linked` / `project_unlinked` event type would cover this.

import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import type { VaultItemProject } from '../../../domain/vault/vault-item-project';
import type { ProjectId, VaultItemId } from '../../../domain/ids';
import { environment } from '../../../../environments/environment';
import { isSeedMode } from '../../../shared/seed-mode';
import { SEED } from '../../../domain/seed';

@Injectable({ providedIn: 'root' })
export class VaultItemProjectsService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/vault-item-projects`;

  // Keyed by vault_item_id string. Lazy-populated via loadFor().
  private readonly _projectsByItem = signal<Record<string, VaultItemProject[]>>({});

  // Returns a computed list of junction rows for this vault item.
  // Callers must invoke inside their own computed() so the vaultItemId input drives reactivity.
  projectsFor(vaultItemId: VaultItemId) {
    return computed(() => this._projectsByItem()[vaultItemId] ?? []);
  }

  loadFor(vaultItemId: VaultItemId): void {
    if (isSeedMode()) {
      const data = SEED.vault_item_projects.filter(p => p.vault_item_id === vaultItemId);
      this._projectsByItem.update(map => ({ ...map, [vaultItemId]: [...data] }));
      return;
    }
    const params = new HttpParams().set('vault_item_id', `eq.${vaultItemId}`);
    this.http.get<VaultItemProject[]>(this.url, { params }).subscribe({
      next: data => this._projectsByItem.update(map => ({ ...map, [vaultItemId]: data })),
      // Silently swallow errors — endpoint doesn't exist yet; empty state is the correct fallback.
      error: () => this._projectsByItem.update(map => ({ ...map, [vaultItemId]: [] })),
    });
  }

  // Optimistic insert — adds junction row locally, then POSTs to server.
  add(vaultItemId: VaultItemId, projectId: ProjectId): void {
    const row: VaultItemProject = { vault_item_id: vaultItemId, project_id: projectId };
    this._projectsByItem.update(map => ({
      ...map,
      [vaultItemId]: [...(map[vaultItemId] ?? []), row],
    }));

    if (isSeedMode()) return;

    this.http.post<VaultItemProject>(this.url, row).subscribe({
      // Nothing to reconcile — composite PK row has no server-generated id.
      error: () => this._projectsByItem.update(map => ({
        ...map,
        [vaultItemId]: (map[vaultItemId] ?? []).filter(r => r.project_id !== projectId),
      })),
    });
  }

  // Optimistic delete — removes junction row locally, then DELETEs on server.
  remove(vaultItemId: VaultItemId, projectId: ProjectId): void {
    const prior = this._projectsByItem()[vaultItemId] ?? [];
    this._projectsByItem.update(map => ({
      ...map,
      [vaultItemId]: prior.filter(r => r.project_id !== projectId),
    }));

    if (isSeedMode()) return;

    const params = new HttpParams()
      .set('vault_item_id', `eq.${vaultItemId}`)
      .set('project_id', `eq.${projectId}`);
    this.http.delete(this.url, { params }).subscribe({
      error: () => this._projectsByItem.update(map => ({ ...map, [vaultItemId]: prior })),
    });
  }
}
