// Reads + mutates vault-item dependency edges via dashboard-api
// (jimbo_pg-backed). Phase 3 part 3 of Phase C — replaces the legacy
// PostgREST scaffold.

import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import type { VaultItemDependency } from '@domain/vault/vault-item-dependency';
import type { VaultItemId } from '@domain/ids';
import type { OpenBlocker } from '@domain/vault/readiness';
import { environment } from '../../../../environments/environment';
import { VaultItemsService } from './vault-items.service';
import { ToastService } from '@shared/components/toast/toast.service';
import { isSeedMode } from '@shared/seed-mode';
import { SEED } from '@domain/seed';

@Injectable({ providedIn: 'root' })
export class VaultItemDependenciesService {
  private readonly http = inject(HttpClient);
  private readonly vaultItemsService = inject(VaultItemsService);
  private readonly toast = inject(ToastService);
  private readonly url = `${environment.dashboardApiUrl}/api/vault-item-dependencies`;

  private readonly _depsByItem = signal<Record<string, VaultItemDependency[]>>({});

  blockersFor(vaultItemId: VaultItemId) {
    return computed((): OpenBlocker[] => {
      const deps = this._depsByItem()[vaultItemId] ?? [];
      const result: OpenBlocker[] = [];
      for (const dep of deps) {
        const blocker = this.vaultItemsService.getById(dep.blocker_id);
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
    const params = new HttpParams().set('blocked_id', vaultItemId);
    this.http.get<{ items: VaultItemDependency[] }>(this.url, { params }).subscribe({
      next: ({ items }) => this._depsByItem.update(map => ({ ...map, [vaultItemId]: items })),
      error: ()         => this._depsByItem.update(map => ({ ...map, [vaultItemId]: [] })),
    });
  }

  add(blockerId: VaultItemId, blockedId: VaultItemId): void {
    const now = new Date().toISOString();
    const row: VaultItemDependency = { blocker_id: blockerId, blocked_id: blockedId, created_at: now };
    this._depsByItem.update(map => ({
      ...map,
      [blockedId]: [...(map[blockedId] ?? []), row],
    }));

    if (isSeedMode()) return;

    this.http.post<VaultItemDependency>(this.url, { blocker_id: blockerId, blocked_id: blockedId }).subscribe({
      error: () => {
        this._depsByItem.update(map => ({
          ...map,
          [blockedId]: (map[blockedId] ?? []).filter(r => r.blocker_id !== blockerId),
        }));
        this.toast.error('Failed to add blocker — removed');
      },
    });
  }

  /** Resolves seq → id, validates, then delegates to add(). Returns an error string on failure. */
  addBySeq(seq: number, blockedId: VaultItemId): string | null {
    const blocker = this.vaultItemsService.getBySeq(seq);
    if (!blocker) return `#${seq} not found`;
    if (blocker.id === blockedId) return 'An item cannot block itself';
    this.add(blocker.id as VaultItemId, blockedId);
    return null;
  }

  remove(blockerId: VaultItemId, blockedId: VaultItemId): void {
    const prior = this._depsByItem()[blockedId] ?? [];
    this._depsByItem.update(map => ({
      ...map,
      [blockedId]: prior.filter(r => r.blocker_id !== blockerId),
    }));

    if (isSeedMode()) return;

    this.http.delete(`${this.url}/${encodeURIComponent(blockerId)}/${encodeURIComponent(blockedId)}`).subscribe({
      error: () => {
        this._depsByItem.update(map => ({ ...map, [blockedId]: prior }));
        this.toast.error('Failed to remove blocker — restored');
      },
    });
  }
}
