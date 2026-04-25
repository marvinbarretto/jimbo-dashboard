import type { ToolId, ToolVersionId } from '../ids';

// A tool is a named capability that a skill can invoke. Examples: a webhook that hits
// jimbo-api, a builtin handler implemented in code, an MCP server endpoint. The Tool row
// is the stable identity (slug + handler kind); behaviour lives on a `ToolVersion`.

export type HandlerType = 'webhook' | 'builtin' | 'mcp';

export interface Tool {
  id:                 ToolId;                  // slug: 'gmail-search', 'fetch-url'
  display_name:       string;
  endpoint_url:       string | null;           // null for builtin / when not externally addressable
  handler_type:       HandlerType;
  current_version_id: ToolVersionId | null;    // points at the promoted version
  is_active:          boolean;
  created_at:         string;
  updated_at:         string;
}

export type CreateToolPayload = Omit<Tool, 'current_version_id' | 'created_at' | 'updated_at'>;
export type UpdateToolPayload = Partial<Omit<Tool, 'id' | 'current_version_id' | 'created_at' | 'updated_at'>>;
