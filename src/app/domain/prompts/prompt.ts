import type { PromptId, PromptVersionId } from '../ids';

// A prompt is the addressable identity of an LLM instruction set. The `Prompt` row is
// the stable handle; the actual text lives on `PromptVersion`. `Skill.prompt_id` points
// at this entity, not at a specific version — the dispatcher picks `current_version_id`
// at runtime so a prompt edit doesn't require a skill update.

export interface Prompt {
  id:                 PromptId;                 // slug: 'intake-quality', 'event-qualifier'
  display_name:       string;
  description:        string | null;
  current_version_id: PromptVersionId | null;   // promoted version; null = no versions yet
  is_active:          boolean;
  created_at:         string;
  updated_at:         string;
}

export type CreatePromptPayload = Omit<Prompt, 'current_version_id' | 'created_at' | 'updated_at'>;
export type UpdatePromptPayload = Partial<Omit<Prompt, 'id' | 'current_version_id' | 'created_at' | 'updated_at'>>;
