export interface Tool {
  id: string;
  display_name: string;
  endpoint_url: string | null;
  handler_type: 'webhook' | 'builtin' | 'mcp';
  current_version_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ToolVersion {
  id: string;
  tool_id: string;
  version: number;
  description: string;
  input_schema: unknown;
  output_schema: unknown;
  notes: string | null;
  parent_version_id: string | null;
  created_at: string;
}

export type CreateToolPayload = Omit<Tool, 'current_version_id' | 'created_at' | 'updated_at'>;
export type UpdateToolPayload = Partial<Omit<Tool, 'id' | 'current_version_id' | 'created_at' | 'updated_at'>>;
export type CreateToolVersionPayload = Omit<ToolVersion, 'id' | 'version' | 'created_at'>;
