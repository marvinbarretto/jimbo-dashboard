// Reads + mutates the hub/models/ filesystem registry via dashboard-api proxy
// at /dashboard-api/api/hub-models. jimbo-api owns the canonical files;
// dashboard-api forwards. Stats remain mocked until the future observability
// dashboard reads from the costs table.

import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import type { Model, ModelMetadata, ModelStats } from '@domain/models';
import { environment } from '../../../../environments/environment';
import { isSeedMode } from '@shared/seed-mode';
import { SEED } from '@domain/seed';

export interface ModelPatch {
  name?: string;
  description?: string;
  metadata?: Partial<ModelMetadata>;
  body?: string;
}

const MOCK_STATS: ModelStats[] = [];

@Injectable({ providedIn: 'root' })
export class ModelsService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.dashboardApiUrl}/api/hub-models`;

  private readonly _models = signal<Model[]>([]);
  private readonly _loading = signal(true);
  private readonly _error = signal<string | null>(null);

  readonly models = this._models.asReadonly();
  readonly activeModels = computed(() =>
    this._models().filter(m => m.metadata.status !== 'deprecated'),
  );
  readonly isLoading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly stats = signal<ModelStats[]>(MOCK_STATS).asReadonly();

  constructor() { this.load(); }

  private load(): void {
    if (isSeedMode()) {
      this._models.set([...SEED.models]);
      this._loading.set(false);
      return;
    }
    this.http.get<Model[]>(this.url).subscribe({
      next: items => { this._models.set(items); this._loading.set(false); },
      error: err => {
        this._error.set(err?.message ?? 'failed to load models');
        this._loading.set(false);
      },
    });
  }

  reload(): void {
    this._loading.set(true);
    this._error.set(null);
    this.load();
  }

  getById(id: string): Model | undefined {
    return this._models().find(m => m.id === id);
  }

  getStatsFor(id: string): ModelStats | undefined {
    return MOCK_STATS.find(s => s.model_id === id);
  }

  update(id: string, patch: ModelPatch): Observable<Model> {
    return this.http.patch<Model>(`${this.url}/${id}`, patch).pipe(
      tap(updated => {
        this._models.update(ms => ms.map(m => m.id === id ? updated : m));
      }),
    );
  }

  create(init: { id: string; name: string; description: string; metadata: ModelMetadata; body: string }): Observable<Model> {
    return this.http.post<Model>(this.url, init).pipe(
      tap(created => {
        this._models.update(ms => [...ms, created].sort((a, b) => a.id.localeCompare(b.id)));
      }),
    );
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`).pipe(
      tap(() => {
        this._models.update(ms => ms.filter(m => m.id !== id));
      }),
    );
  }
}
