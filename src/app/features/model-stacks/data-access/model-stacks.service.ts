// Reads + mutates hub/model-stacks/ via dashboard-api proxy.

import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import type { ModelStack, ModelStackMetadata } from '@domain/model-stacks';
import { environment } from '../../../../environments/environment';
import { isSeedMode } from '@shared/seed-mode';
import { SEED } from '@domain/seed';

export interface ModelStackPatch {
  name?: string;
  description?: string;
  metadata?: Partial<ModelStackMetadata>;
  body?: string;
}

@Injectable({ providedIn: 'root' })
export class ModelStacksService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.dashboardApiUrl}/api/hub-model-stacks`;

  private readonly _stacks = signal<ModelStack[]>([]);
  private readonly _loading = signal(true);
  private readonly _error = signal<string | null>(null);

  readonly stacks = this._stacks.asReadonly();
  readonly activeStacks = computed(() =>
    this._stacks().filter(s => s.metadata.is_active !== false),
  );
  readonly isLoading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  constructor() { this.load(); }

  private load(): void {
    if (isSeedMode()) {
      this._stacks.set([...SEED.model_stacks]);
      this._loading.set(false);
      return;
    }
    this.http.get<ModelStack[]>(this.url).subscribe({
      next: items => { this._stacks.set(items); this._loading.set(false); },
      error: err => {
        this._error.set(err?.message ?? 'failed to load model stacks');
        this._loading.set(false);
      },
    });
  }

  reload(): void {
    this._loading.set(true);
    this._error.set(null);
    this.load();
  }

  getById(id: string): ModelStack | undefined {
    return this._stacks().find(s => s.id === id);
  }

  update(id: string, patch: ModelStackPatch): Observable<ModelStack> {
    return this.http.patch<ModelStack>(`${this.url}/${id}`, patch).pipe(
      tap(updated => {
        this._stacks.update(ss => ss.map(s => s.id === id ? updated : s));
      }),
    );
  }

  create(init: { id: string; name: string; description: string; metadata: ModelStackMetadata; body: string }): Observable<ModelStack> {
    return this.http.post<ModelStack>(this.url, init).pipe(
      tap(created => {
        this._stacks.update(ss => [...ss, created].sort((a, b) => a.id.localeCompare(b.id)));
      }),
    );
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`).pipe(
      tap(() => {
        this._stacks.update(ss => ss.filter(s => s.id !== id));
      }),
    );
  }
}
