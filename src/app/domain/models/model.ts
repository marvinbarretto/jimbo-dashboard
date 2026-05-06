// A model is a tracked LLM the operator is considering, using, or has retired.
// The canonical source is `hub/models/<provider>/<name>.md` — a personal
// catalogue committed to git. Most rows are synced from OpenRouter, with a
// thin layer of operator annotations on top.
//
// Schema strategy: fields prefixed by their OpenRouter origin keep upstream
// names + units verbatim so a sync job can replace those slices wholesale
// without translation. Operator annotations (status, classes, etc.) live
// alongside but are owned by the operator, not overwritten on sync.

import type { SkillCapability } from '../capability';
import type {
  OpenRouterArchitecture,
  OpenRouterPricing,
  OpenRouterTopProvider,
} from './openrouter';

export type ModelStatus = 'candidate' | 'preferred' | 'deprecated';

// Provenance — does this row sync from OpenRouter, or is it a manual entry
// (e.g. local Ollama models, internal endpoints)? Sync jobs only refresh
// 'openrouter' rows.
export type ModelSource = 'openrouter' | 'manual';

export interface ModelMetadata {
  // ── Operator annotations (your own — never overwritten on sync) ──
  status: ModelStatus;
  source: ModelSource;
  considered_at?: string;
  deprecated_at?: string | null;
  // Capability classes this model satisfies. Operator-overridable; some
  // values (vision, long-context) can be derived from upstream fields.
  classes?: SkillCapability[];
  // Free-text grouping for the catalogue — typically the OpenRouter author.
  provider: string;

  // ── Mirrored from OpenRouter (verbatim names + units) ──
  // Populated on sync for source='openrouter'; can be filled manually
  // for source='manual' rows where the field is meaningful.
  canonical_slug?: string;
  hugging_face_id?: string | null;
  context_length?: number;
  architecture?: OpenRouterArchitecture;
  pricing?: OpenRouterPricing;
  top_provider?: OpenRouterTopProvider;
  supported_parameters?: string[];
  knowledge_cutoff?: string | null;
  expiration_date?: string | null;
  created?: number;                 // Unix timestamp from OpenRouter
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
