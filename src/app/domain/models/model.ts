import type { ModelId } from '../ids';

// String unions over enums: values serialise cleanly to/from JSON and Postgres
// with no conversion layer. Enums create a runtime object and require mapping
// at every API boundary — not worth it when the string IS the value.
//
// Cost-anchored tiers. Each maps to a documented input-cost range per million tokens.
// Tier is both a Model classification (what this model costs) and a Skill budget hint
// (what a skill is willing to pay). Dispatcher matches via string equality.
//
//   free      — $0 / MTok (local compute)
//   budget    — < $1 / MTok input  (currently: Haiku-class, nano-class)
//   standard  — $1 – $10 / MTok    (currently: Sonnet-class)
//   premium   — ≥ $10 / MTok       (currently: Opus-class, frontier)
//
// Thresholds are doc-only; if pricing shifts (usually down), the boundaries move
// without renaming the enum.
export type ModelTier = 'free' | 'budget' | 'standard' | 'premium';
export type ModelProvider = 'anthropic' | 'google' | 'openai' | 'x-ai' | 'deepseek' | 'meta';
export type ModelCapability = 'code' | 'text' | 'vision' | 'reasoning' | 'math' | 'video';

// Exported constant so templates and forms can iterate without duplicating the union members.
export const MODEL_CAPABILITIES: ModelCapability[] = ['code', 'text', 'vision', 'reasoning', 'math', 'video'];

export interface Model {
  id:                   ModelId;                  // OpenRouter format: 'anthropic/claude-sonnet-4-6'
  display_name:         string;
  provider:             ModelProvider;
  tier:                 ModelTier;
  capabilities:         ModelCapability[];
  context_window:       number | null;
  input_cost_per_mtok:  number | null;            // nominal, from OpenRouter
  output_cost_per_mtok: number | null;
  is_active:            boolean;
  notes:                string | null;
  created_at:           string;
  updated_at:           string;
}

// Per-model run statistics. Read-only projection emitted by the metrics pipeline,
// not a CRUD entity. Kept here because it shares the ModelId namespace.
export interface ModelStats {
  model_id:          ModelId;
  total_runs:        number;
  mean_cost_per_run: number | null;
  mean_duration_ms:  number | null;
  timeout_rate:      number | null;
}

export type CreateModelPayload = Omit<Model, 'created_at' | 'updated_at'>;
export type UpdateModelPayload = Partial<Omit<Model, 'id' | 'created_at' | 'updated_at'>>;
