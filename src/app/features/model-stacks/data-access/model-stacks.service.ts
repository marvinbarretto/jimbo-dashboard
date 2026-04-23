import { Injectable, signal, computed } from '@angular/core';
import type { ModelStack, CreateModelStackPayload, UpdateModelStackPayload } from '../utils/model-stack.types';

const MOCK_STACKS: ModelStack[] = [
  {
    id: 'code-reasoning',
    display_name: 'Code & Reasoning',
    description: 'For tasks requiring code generation, review, or deep reasoning.',
    model_ids: [
      'anthropic/claude-sonnet-4-6',
      'anthropic/claude-opus-4-7',
      'openai/gpt-4o-mini',
    ],
    fast_model_id: 'google/gemini-2.5-flash-lite',
    is_active: true,
    created_at: '2026-04-22T00:00:00Z',
    updated_at: '2026-04-22T00:00:00Z',
  },
  {
    id: 'writing-analysis',
    display_name: 'Writing & Analysis',
    description: 'For long-form writing, summarisation, and content analysis.',
    model_ids: [
      'anthropic/claude-opus-4-7',
      'anthropic/claude-sonnet-4-6',
      'openai/gpt-5-nano',
    ],
    fast_model_id: 'openai/gpt-5-nano',
    is_active: true,
    created_at: '2026-04-22T00:00:00Z',
    updated_at: '2026-04-22T00:00:00Z',
  },
  {
    id: 'vision',
    display_name: 'Vision',
    description: 'For tasks involving image or video understanding.',
    model_ids: [
      'google/gemini-2.5-flash',
      'openai/gpt-4o-mini',
    ],
    fast_model_id: null,
    is_active: true,
    created_at: '2026-04-22T00:00:00Z',
    updated_at: '2026-04-22T00:00:00Z',
  },
  {
    id: 'budget',
    display_name: 'Budget',
    description: 'Maximise throughput at minimum cost. Accepts quality trade-offs.',
    model_ids: [
      'openai/gpt-5-nano',
      'google/gemini-2.5-flash-lite',
    ],
    fast_model_id: 'google/gemini-2.5-flash-lite',
    is_active: true,
    created_at: '2026-04-22T00:00:00Z',
    updated_at: '2026-04-22T00:00:00Z',
  },
];

@Injectable({ providedIn: 'root' })
export class ModelStacksService {
  private readonly _stacks = signal<ModelStack[]>(MOCK_STACKS);

  readonly stacks = this._stacks.asReadonly();
  readonly activeStacks = computed(() => this._stacks().filter(s => s.is_active));

  getById(id: string): ModelStack | undefined {
    return this._stacks().find(s => s.id === id);
  }

  create(payload: CreateModelStackPayload): void {
    const now = new Date().toISOString();
    this._stacks.update(stacks => [...stacks, { ...payload, created_at: now, updated_at: now }]);
  }

  update(id: string, patch: UpdateModelStackPayload): void {
    const now = new Date().toISOString();
    this._stacks.update(stacks =>
      stacks.map(s => s.id === id ? { ...s, ...patch, updated_at: now } : s)
    );
  }

  remove(id: string): void {
    this._stacks.update(stacks => stacks.filter(s => s.id !== id));
  }
}
