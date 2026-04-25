// NOTE: The /actors endpoint does not yet exist in jimbo-api (Hono + SQLite on VPS).
// This service scaffolds the pattern so the frontend is ready when the backend catches up.

import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import type { Actor, CreateActorPayload, UpdateActorPayload } from '@domain/actors';
import { environment } from '../../../../environments/environment';
import { isSeedMode } from '@shared/seed-mode';
import { SEED } from '@domain/seed';

@Injectable({ providedIn: 'root' })
export class ActorsService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/actors`;

  private readonly _actors = signal<Actor[]>([]);
  private readonly _loading = signal(true);

  readonly actors = this._actors.asReadonly();
  readonly activeActors = computed(() => this._actors().filter(a => a.is_active));
  readonly isLoading = this._loading.asReadonly();

  constructor() { this.load(); }

  private load(): void {
    if (isSeedMode()) {
      this._actors.set([...SEED.actors]);
      this._loading.set(false);
      return;
    }
    this.http.get<Actor[]>(`${this.url}?order=display_name`).subscribe({
      next: data => { this._actors.set(data); this._loading.set(false); },
      error: ()   => this._loading.set(false),
    });
  }

  getById(id: string): Actor | undefined {
    return this._actors().find(a => a.id === id);
  }

  create(payload: CreateActorPayload): void {
    const now = new Date().toISOString();
    const optimistic: Actor = { ...payload, created_at: now, updated_at: now };
    this._actors.update(as => [...as, optimistic]);
    this.http.post<Actor[]>(this.url, payload, { headers: { Prefer: 'return=representation' } })
      .subscribe({
        next: ([created]) => this._actors.update(as => as.map(a => a.id === payload.id ? created : a)),
        error: ()          => this._actors.update(as => as.filter(a => a.id !== payload.id)),
      });
  }

  update(id: string, patch: UpdateActorPayload): void {
    const params = new HttpParams().set('id', `eq.${id}`);
    this.http.patch<Actor[]>(this.url, patch, { params, headers: { Prefer: 'return=representation' } })
      .subscribe({ next: ([updated]) => this._actors.update(as => as.map(a => a.id === id ? updated : a)) });
  }

  remove(id: string): void {
    const params = new HttpParams().set('id', `eq.${id}`);
    this.http.delete(this.url, { params })
      .subscribe({ next: () => this._actors.update(as => as.filter(a => a.id !== id)) });
  }
}
