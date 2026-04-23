// id is the directory slug from hermes/skills/{id}/SKILL.md — the dashboard
// references the prompt, it never stores it. Prompt content lives in the hub.
export interface Skill {
  id: string;
  display_name: string;
  description: string | null;
  model_stack_id: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type CreateSkillPayload = Omit<Skill, 'created_at' | 'updated_at'>;
export type UpdateSkillPayload = Partial<Omit<Skill, 'id' | 'created_at' | 'updated_at'>>;
