import type { ActorId, SkillId } from '../ids';

// Which skills each actor is permitted and able to run.
// Many-to-many: one actor has many skills, one skill is held by many actors.
// Presence of a row = routing is allowed. Absence = skip this actor for that skill.
//
// `proficiency` is a routing weight, not a hard gate. 'preferred' actors are picked first;
// 'capable' is the default; 'experimental' means we're still evaluating — route only when
// preferred actors are unavailable, and watch outcomes.

export type ActorSkillProficiency = 'preferred' | 'capable' | 'experimental';

export interface ActorSkill {
  actor_id: ActorId;
  skill_id: SkillId;
  proficiency: ActorSkillProficiency;
  created_at: string;
}

export type CreateActorSkillPayload = Omit<ActorSkill, 'created_at'>;
export type UpdateActorSkillPayload = Pick<ActorSkill, 'proficiency'>;
