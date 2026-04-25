import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import type { ModelStack, CreateModelStackPayload, UpdateModelStackPayload } from '../utils/model-stack.types';
import { environment } from '../../../../environments/environment';
import { isSeedMode } from '../../../shared/seed-mode';
import { SEED } from '../../../domain/seed';

@Injectable({ providedIn: 'root' })
export class ModelStacksService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/model_stacks`;

  private readonly _stacks = signal<ModelStack[]>([]);
  private readonly _loading = signal(true);

  readonly stacks = this._stacks.asReadonly();
  readonly activeStacks = computed(() => this._stacks().filter(s => s.is_active));
  readonly isLoading = this._loading.asReadonly();

  constructor() { this.load(); }

  private load(): void {
    if (isSeedMode()) {
      this._stacks.set([...SEED.model_stacks]);
      this._loading.set(false);
      return;
    }
    this.http.get<ModelStack[]>(`${this.url}?order=display_name`).subscribe({
      next: data => { this._stacks.set(data); this._loading.set(false); },
      error: ()   => this._loading.set(false),
    });
  }

  getById(id: string): ModelStack | undefined {
    return this._stacks().find(s => s.id === id);
  }

  create(payload: CreateModelStackPayload): void {
    const now = new Date().toISOString();
    const optimistic: ModelStack = { ...payload, created_at: now, updated_at: now };
    this._stacks.update(ss => [...ss, optimistic]);
    this.http.post<ModelStack[]>(this.url, payload, { headers: { Prefer: 'return=representation' } })
      .subscribe({
        next: ([created]) => this._stacks.update(ss => ss.map(s => s.id === payload.id ? created : s)),
        error: ()          => this._stacks.update(ss => ss.filter(s => s.id !== payload.id)),
      });
  }

  update(id: string, patch: UpdateModelStackPayload): void {
    const params = new HttpParams().set('id', `eq.${id}`);
    this.http.patch<ModelStack[]>(this.url, patch, { params, headers: { Prefer: 'return=representation' } })
      .subscribe({ next: ([updated]) => this._stacks.update(ss => ss.map(s => s.id === id ? updated : s)) });
  }

  remove(id: string): void {
    const params = new HttpParams().set('id', `eq.${id}`);
    this.http.delete(this.url, { params })
      .subscribe({ next: () => this._stacks.update(ss => ss.filter(s => s.id !== id)) });
  }
}
