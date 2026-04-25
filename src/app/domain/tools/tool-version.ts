import type { ToolId, ToolVersionId } from '../ids';

// Immutable per-version contract. Editing a tool's I/O shape produces a new version row;
// promoting it flips `tools.current_version_id`. Same lineage pattern as PromptVersion.

export interface ToolVersion {
  id:                ToolVersionId;     // UUID, immutable
  tool_id:           ToolId;
  version:           number;            // monotonic per tool, assigned at write
  description:       string;
  input_schema:      unknown;           // JSON Schema; `unknown` at TS level, runtime-validated
  output_schema:     unknown;
  notes:             string | null;
  parent_version_id: ToolVersionId | null;   // lineage edge for diff views
  created_at:        string;
  // No `updated_at` — versions are immutable (P6).
}

export type CreateToolVersionPayload = Omit<ToolVersion, 'id' | 'version' | 'created_at'>;
