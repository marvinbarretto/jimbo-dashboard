// No-op shell — models table dropped in Phase A2 cleanup. Pricing reverted
// to hardcoded rates in jimbo-api/src/services/pricing.ts.

import { Injectable, signal, computed } from '@angular/core';
import type { Model, CreateModelPayload, UpdateModelPayload, ModelStats } from '../utils/model.types';
import { modelId } from '@domain/ids';
import { isSeedMode } from '@shared/seed-mode';
import { SEED } from '@domain/seed';

const MOCK_STATS: ModelStats[] = [
  { model_id: modelId('openai/gpt-5-nano'),            total_runs: 7, mean_cost_per_run: 0.0073, mean_duration_ms: 1200,  timeout_rate: 0    },
  { model_id: modelId('google/gemini-2.5-flash-lite'), total_runs: 5, mean_cost_per_run: 0.0221, mean_duration_ms: 1800,  timeout_rate: 0    },
  { model_id: modelId('deepseek/deepseek-chat-v3.1'),  total_runs: 8, mean_cost_per_run: 0.1439, mean_duration_ms: 28000, timeout_rate: 0.25 },
];

@Injectable({ providedIn: 'root' })
export class ModelsService {
  private readonly _models = signal<Model[]>(isSeedMode() ? [...SEED.models] : []);
  private readonly _loading = signal(false);

  readonly models = this._models.asReadonly();
  readonly activeModels = computed(() => this._models().filter(m => m.is_active));
  readonly isLoading = this._loading.asReadonly();
  readonly stats = signal<ModelStats[]>(MOCK_STATS).asReadonly();

  getById(id: string): Model | undefined {
    return this._models().find(m => m.id === id);
  }

  getStatsFor(id: string): ModelStats | undefined {
    return MOCK_STATS.find(s => s.model_id === id);
  }

  create(_payload: CreateModelPayload): void {}
  update(_id: string, _patch: UpdateModelPayload): void {}
  remove(_id: string): void {}
}
