import type { ModelStack } from './model-stack';
import { modelId, modelStackId } from '../ids';

// Stacks express ordered fallback cascades. `code-reasoning` prefers Sonnet, falls
// back to Opus, with Haiku as the cheap "fast" pass for trivial subtasks. `budget`
// is for cost-sensitive routine work — Haiku primary, GPT-5 nano as fallback.

export const MODEL_STACKS = [
  {
    id: modelStackId('code-reasoning'),
    display_name: 'Code reasoning',
    description: 'Default for skills that mix code + reasoning (decompose, ac-builder).',
    model_ids: [
      modelId('anthropic/claude-sonnet-4-6'),
      modelId('anthropic/claude-opus-4-7'),
    ],
    fast_model_id: modelId('anthropic/claude-haiku-4-5'),
    is_active: true,
    created_at: '2026-03-01T09:00:00Z',
    updated_at: '2026-03-01T09:00:00Z',
  },
  {
    id: modelStackId('budget'),
    display_name: 'Budget',
    description: 'Cheap pass for routine classification and intake-quality.',
    model_ids: [
      modelId('anthropic/claude-haiku-4-5'),
      modelId('openai/gpt-5-nano'),
    ],
    fast_model_id: null,
    is_active: true,
    created_at: '2026-03-01T09:00:00Z',
    updated_at: '2026-03-01T09:00:00Z',
  },
] as const satisfies readonly ModelStack[];
