// A model is a tracked LLM the operator is considering, using, or has retired.
// The canonical source is `hub/models/<provider>/<name>.md` — a personal
// catalogue committed to git. Today the registry is documentation only;
// runtime pricing lives in jimbo-api's hardcoded RATES table. When agents
// grow native fallback support, runners will read these files at dispatch.

export type ModelStatus = 'candidate' | 'preferred' | 'deprecated';

export interface ModelPrices {
  input?: number | null;
  output?: number | null;
  cache_read?: number | null;
  cache_write?: number | null;
}

export interface ModelMetadata {
  status: ModelStatus;
  provider: string;
  context_window?: number;
  prices_usd_per_million?: ModelPrices;
  considered_at?: string;
  deprecated_at?: string | null;
}

export interface Model {
  // Slash-path: `<provider>/<model-name>` matching OpenRouter's convention
  // and the directory layout under hub/models/.
  id: string;
  name: string;
  description: string;
  metadata: ModelMetadata;
  body: string;                   // free-text notes after the frontmatter
}

// Per-model run statistics. Read-only projection — not part of CRUD.
// Currently mocked; the future /costs observability dashboard will populate
// this from the costs table.
export interface ModelStats {
  model_id: string;
  total_runs: number;
  mean_cost_per_run: number | null;
  mean_duration_ms: number | null;
  timeout_rate: number | null;
}

// Helpers to peel apart the slash-path id.
export function modelProvider(id: string): string | null {
  const slash = id.indexOf('/');
  return slash === -1 ? null : id.slice(0, slash);
}

export function modelLocalName(id: string): string {
  const slash = id.indexOf('/');
  return slash === -1 ? id : id.slice(slash + 1);
}
