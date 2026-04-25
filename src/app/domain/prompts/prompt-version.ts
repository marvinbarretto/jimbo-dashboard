import type { PromptId, PromptVersionId } from '../ids';

// Immutable text + I/O contract. Each save produces a new version row; promoting it
// flips `prompts.current_version_id`. Lineage tracked via `parent_version_id` for diffing.

export interface PromptVersion {
  id:                PromptVersionId;     // UUID, immutable
  prompt_id:         PromptId;
  version:           number;              // monotonic per prompt, assigned at write
  system_content:    string;
  user_content:      string | null;
  notes:             string | null;
  input_schema:      unknown;             // JSON Schema; runtime-validated
  output_schema:     unknown;
  parent_version_id: PromptVersionId | null;
  created_at:        string;
  // No `updated_at` — versions are immutable (P6).
}

export type CreatePromptVersionPayload = Omit<PromptVersion, 'id' | 'version' | 'created_at'>;
