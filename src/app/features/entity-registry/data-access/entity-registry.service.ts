import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { EntityRegistryEntry } from '@domain/entity-registry';
import { environment } from '../../../../environments/environment';
import { ToastService } from '@shared/components/toast/toast.service';

@Injectable({ providedIn: 'root' })
export class EntityRegistryService {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly url = `${environment.dashboardApiUrl}/api/entities`;

  private readonly _entities = signal<EntityRegistryEntry[]>([]);
  readonly loading = signal(false);

  readonly entities = computed(() => this._entities());
  readonly resolvedCount = computed(() => this._entities().filter(e => e.description !== null).length);
  readonly unresolvedCount = computed(() => this._entities().filter(e => e.description === null).length);

  load(): void {
    this.loading.set(true);
    this.http.get<{ entities: EntityRegistryEntry[] }>(this.url).subscribe({
      next: ({ entities }) => { this._entities.set(entities); this.loading.set(false); },
      error: () => { this.toast.error('Failed to load entity registry'); this.loading.set(false); },
    });
  }
}
