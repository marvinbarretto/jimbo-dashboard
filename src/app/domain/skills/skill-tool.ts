import type { SkillId, ToolId } from '../ids';

// Many-to-many: skills can use multiple tools; tools can be used by multiple skills.
// Same pattern as actor_skills and vault_item_project — minimal junction, composite PK.
// No `created_at` — the linkage is a mutation and produces an activity event.

export interface SkillTool {
  skill_id: SkillId;   // composite PK part 1
  tool_id:  ToolId;    // composite PK part 2
}

export type CreateSkillToolPayload = SkillTool;
