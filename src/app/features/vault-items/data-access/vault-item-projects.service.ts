// Junction rows for vault_items ↔ projects. Production is small (190 rows
// total) so we bulk-load all junctions once at startup instead of doing
// per-item lazy fetches that would N+1 against 2,353 items.
//
// loadFor() is preserved as a no-op-when-bulk-loaded shim so existing callers
// don't need to change. Operator-side mutations still go via PostgREST until
// write endpoints exist.

import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import type { VaultItemProject } from '@domain/vault/vault-item-project';
import type { ProjectId, VaultItemId } from '@domain/ids';
import { vaultItemId as toVaultItemId, projectId as toProjectId } from '@domain/ids';
import { environment } from '../../../../environments/environment';
import { isSeedMode } from '@shared/seed-mode';
import { SEED } from '@domain/seed';

@Injectable({ providedIn: 'root' })
export class VaultItemProjectsService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.dashboardApiUrl}/api/vault-item-projects`;

  // Keyed by vault_item_id string. Bulk-populated on construction (non-seed)
  // or lazy-populated via loadFor() (seed mode legacy path).
  private readonly _projectsByItem = signal<Record<string, VaultItemProject[]>>({});

  // Tracks whether we've bulk-loaded; loadFor() short-circuits once true.
  private bulkLoaded = false;

  constructor() {
    if (!isSeedMode()) this.loadAll();
  }

  // Returns a computed list of junction rows for this vault item.
  // Callers must invoke inside their own computed() so the vaultItemId input drives reactivity.
  projectsFor(vaultItemId: VaultItemId) {
    return computed(() => this._projectsByItem()[vaultItemId] ?? []);
  }

  loadFor(vaultItemId: VaultItemId): void {
    if (this.bulkLoaded) return;
    if (isSeedMode()) {
      const data = SEED.vault_item_projects.filter(p => p.vault_item_id === vaultItemId);
      this._projectsByItem.update(map => ({ ...map, [vaultItemId]: [...data] }));
      return;
    }
  }

  private loadAll(): void {
    this.http.get<{ items: ApiVaultItemProject[] }>(`${environment.dashboardApiUrl}/api/vault-item-projects`).subscribe({
      next: ({ items }) => {
        const byItem: Record<string, VaultItemProject[]> = {};
        for (const row of items) {
          const link: VaultItemProject = {
            vault_item_id: toVaultItemId(row.vault_item_id),
            project_id:    toProjectId(row.project_id),
          };
          (byItem[row.vault_item_id] ??= []).push(link);
        }
        this._projectsByItem.set(byItem);
        this.bulkLoaded = true;
      },
      error: () => { /* empty fallback OK; consumers see no project chip */ },
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

    this.http.delete(`${this.url}/${encodeURIComponent(vaultItemId)}/${encodeURIComponent(projectId)}`).subscribe({
      error: () => this._projectsByItem.update(map => ({ ...map, [vaultItemId]: prior })),
    });
  }
}

// Production junction shape — same as domain VaultItemProject but with the
// extra is_primary flag. The domain doesn't model that yet; ignored here.
interface ApiVaultItemProject {
  vault_item_id: string;
  project_id: string;
  is_primary: boolean;
  created_at: string;
}
