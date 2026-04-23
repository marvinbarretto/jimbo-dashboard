export type ModelTier = 'free' | 'fast' | 'balanced' | 'powerful';
export type ModelProvider = 'anthropic' | 'google' | 'openai' | 'x-ai' | 'deepseek' | 'meta';

export interface Model {
  id: string;               // OpenRouter format: 'anthropic/claude-sonnet-4-6'
  display_name: string;
  provider: ModelProvider;
  tier: ModelTier;
  context_window: number | null;
  input_cost_per_mtok: number | null;   // nominal, from OpenRouter
  output_cost_per_mtok: number | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ModelStats {
  model_id: string;
  total_runs: number;
  mean_cost_per_run: number | null;
  mean_duration_ms: number | null;
  timeout_rate: number | null;
}

export type CreateModelPayload = Omit<Model, 'created_at' | 'updated_at'>;
export type UpdateModelPayload = Partial<Omit<Model, 'id' | 'created_at' | 'updated_at'>>;
