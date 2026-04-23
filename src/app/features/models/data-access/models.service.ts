import { Injectable, signal, computed } from '@angular/core';
import type { Model, CreateModelPayload, UpdateModelPayload, ModelStats } from '../utils/model.types';

const MOCK_MODELS: Model[] = [
  {
    id: 'anthropic/claude-sonnet-4-6',
    display_name: 'Claude Sonnet 4.6',
    provider: 'anthropic',
    tier: 'balanced',
    capabilities: ['code', 'text', 'reasoning'],
    context_window: 200000,
    input_cost_per_mtok: 3.00,
    output_cost_per_mtok: 15.00,
    is_active: true,
    notes: null,
    created_at: '2026-04-22T00:00:00Z',
    updated_at: '2026-04-22T00:00:00Z',
  },
  {
    id: 'anthropic/claude-opus-4-7',
    display_name: 'Claude Opus 4.7',
    provider: 'anthropic',
    tier: 'powerful',
    capabilities: ['code', 'text', 'reasoning', 'math'],
    context_window: 200000,
    input_cost_per_mtok: 15.00,
    output_cost_per_mtok: 75.00,
    is_active: true,
    notes: null,
    created_at: '2026-04-22T00:00:00Z',
    updated_at: '2026-04-22T00:00:00Z',
  },
  {
    id: 'google/gemini-2.5-flash',
    display_name: 'Gemini 2.5 Flash',
    provider: 'google',
    tier: 'fast',
    capabilities: ['text', 'vision', 'video'],
    context_window: 1000000,
    input_cost_per_mtok: 0.15,
    output_cost_per_mtok: 0.60,
    is_active: true,
    notes: null,
    created_at: '2026-04-22T00:00:00Z',
    updated_at: '2026-04-22T00:00:00Z',
  },
  {
    id: 'google/gemini-2.5-flash-lite',
    display_name: 'Gemini 2.5 Flash Lite',
    provider: 'google',
    tier: 'free',
    capabilities: ['text'],
    context_window: 1000000,
    input_cost_per_mtok: 0.075,
    output_cost_per_mtok: 0.30,
    is_active: true,
    notes: null,
    created_at: '2026-04-22T00:00:00Z',
    updated_at: '2026-04-22T00:00:00Z',
  },
  {
    id: 'openai/gpt-5-nano',
    display_name: 'GPT-5 Nano',
    provider: 'openai',
    tier: 'fast',
    capabilities: ['text', 'reasoning'],
    context_window: 128000,
    input_cost_per_mtok: 0.15,
    output_cost_per_mtok: 0.60,
    is_active: true,
    notes: 'Strong calendar-fmt and web-fact performer in bake-off v2',
    created_at: '2026-04-22T00:00:00Z',
    updated_at: '2026-04-22T00:00:00Z',
  },
  {
    id: 'openai/gpt-4o-mini',
    display_name: 'GPT-4o Mini',
    provider: 'openai',
    tier: 'fast',
    capabilities: ['text', 'vision', 'reasoning'],
    context_window: 128000,
    input_cost_per_mtok: 0.15,
    output_cost_per_mtok: 0.60,
    is_active: true,
    notes: null,
    created_at: '2026-04-22T00:00:00Z',
    updated_at: '2026-04-22T00:00:00Z',
  },
  {
    id: 'deepseek/deepseek-chat-v3.1',
    display_name: 'DeepSeek Chat v3.1',
    provider: 'deepseek',
    tier: 'balanced',
    capabilities: ['code', 'reasoning', 'math'],
    context_window: 64000,
    input_cost_per_mtok: 0.27,
    output_cost_per_mtok: 1.10,
    is_active: false,
    notes: 'Tool-looping risk — $0.42 drain in bake-off v2. Timeout rate high.',
    created_at: '2026-04-22T00:00:00Z',
    updated_at: '2026-04-22T00:00:00Z',
  },
];

const MOCK_STATS: ModelStats[] = [
  { model_id: 'openai/gpt-5-nano', total_runs: 7, mean_cost_per_run: 0.0073, mean_duration_ms: 1200, timeout_rate: 0 },
  { model_id: 'google/gemini-2.5-flash-lite', total_runs: 5, mean_cost_per_run: 0.0221, mean_duration_ms: 1800, timeout_rate: 0 },
  { model_id: 'deepseek/deepseek-chat-v3.1', total_runs: 8, mean_cost_per_run: 0.1439, mean_duration_ms: 28000, timeout_rate: 0.25 },
];

@Injectable({ providedIn: 'root' })
export class ModelsService {
  private readonly _models = signal<Model[]>(MOCK_MODELS);
  private readonly _stats = signal<ModelStats[]>(MOCK_STATS);

  readonly models = this._models.asReadonly();
  readonly activeModels = computed(() => this._models().filter(m => m.is_active));
  readonly stats = this._stats.asReadonly();

  getById(id: string): Model | undefined {
    return this._models().find(m => m.id === id);
  }

  getStatsFor(id: string): ModelStats | undefined {
    return this._stats().find(s => s.model_id === id);
  }

  create(payload: CreateModelPayload): void {
    const now = new Date().toISOString();
    this._models.update(models => [...models, { ...payload, created_at: now, updated_at: now }]);
  }

  update(id: string, patch: UpdateModelPayload): void {
    const now = new Date().toISOString();
    this._models.update(models =>
      models.map(m => m.id === id ? { ...m, ...patch, updated_at: now } : m)
    );
  }

  remove(id: string): void {
    this._models.update(models => models.filter(m => m.id !== id));
  }
}
