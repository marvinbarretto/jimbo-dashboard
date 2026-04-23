import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import type { Model, CreateModelPayload, UpdateModelPayload, ModelStats } from '../utils/model.types';
import { environment } from '../../../../environments/environment';

// Stats are derived from run history, not stored in the control-plane tables.
// Kept as mock until the runs table is migrated to Postgres.
const MOCK_STATS: ModelStats[] = [
  { model_id: 'openai/gpt-5-nano',            total_runs: 7, mean_cost_per_run: 0.0073, mean_duration_ms: 1200,  timeout_rate: 0    },
  { model_id: 'google/gemini-2.5-flash-lite', total_runs: 5, mean_cost_per_run: 0.0221, mean_duration_ms: 1800,  timeout_rate: 0    },
  { model_id: 'deepseek/deepseek-chat-v3.1',  total_runs: 8, mean_cost_per_run: 0.1439, mean_duration_ms: 28000, timeout_rate: 0.25 },
];

@Injectable({ providedIn: 'root' })
export class ModelsService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/models`;

  private readonly _models = signal<Model[]>([]);
  private readonly _loading = signal(true);

  readonly models = this._models.asReadonly();
  readonly activeModels = computed(() => this._models().filter(m => m.is_active));
  readonly isLoading = this._loading.asReadonly();
  readonly stats = signal<ModelStats[]>(MOCK_STATS).asReadonly();

  constructor() { this.load(); }

  private load(): void {
    this.http.get<Model[]>(`${this.url}?order=display_name`).subscribe({
      next: data => { this._models.set(data); this._loading.set(false); },
      error: ()   => this._loading.set(false),
    });
  }

  getById(id: string): Model | undefined {
    return this._models().find(m => m.id === id);
  }

  getStatsFor(id: string): ModelStats | undefined {
    return MOCK_STATS.find(s => s.model_id === id);
  }

  create(payload: CreateModelPayload): void {
    const now = new Date().toISOString();
    const optimistic: Model = { ...payload, created_at: now, updated_at: now };
    this._models.update(ms => [...ms, optimistic]);
    this.http.post<Model[]>(this.url, payload, { headers: { Prefer: 'return=representation' } })
      .subscribe({
        next: ([created]) => this._models.update(ms => ms.map(m => m.id === payload.id ? created : m)),
        error: ()          => this._models.update(ms => ms.filter(m => m.id !== payload.id)),
      });
  }

  update(id: string, patch: UpdateModelPayload): void {
    const params = new HttpParams().set('id', `eq.${id}`);
    this.http.patch<Model[]>(this.url, patch, { params, headers: { Prefer: 'return=representation' } })
      .subscribe({ next: ([updated]) => this._models.update(ms => ms.map(m => m.id === id ? updated : m)) });
  }

  remove(id: string): void {
    const params = new HttpParams().set('id', `eq.${id}`);
    this.http.delete(this.url, { params })
      .subscribe({ next: () => this._models.update(ms => ms.filter(m => m.id !== id)) });
  }
}
