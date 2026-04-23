export interface Prompt {
  id: string;
  display_name: string;
  description: string | null;
  current_version_id: string | null;  // UUID of the promoted version
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PromptVersion {
  id: string;           // UUID assigned by DB
  prompt_id: string;
  version: number;      // monotonic per prompt, assigned by trigger
  system_content: string;
  user_content: string | null;
  notes: string | null;
  input_schema: unknown;
  output_schema: unknown;
  parent_version_id: string | null;
  created_at: string;   // immutable — no updated_at by design
}

export type CreatePromptPayload = Omit<Prompt, 'current_version_id' | 'created_at' | 'updated_at'>;
export type UpdatePromptPayload = Partial<Omit<Prompt, 'id' | 'current_version_id' | 'created_at' | 'updated_at'>>;
export type CreateVersionPayload = Omit<PromptVersion, 'id' | 'version' | 'created_at'>;
