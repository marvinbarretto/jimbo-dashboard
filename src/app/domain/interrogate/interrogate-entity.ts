// Mirrors jimbo-api/src/schemas/interrogate.ts — the 8 belief-entity shapes
// that make up Jimbo's self-model of Marvin. Hand-synced (see domain/README.md
// "Relationship to features/*/utils/" — no shared package yet).
import type { InterrogateEntityId } from '@domain/ids';

export type EntityStatus = 'active' | 'archived' | 'superseded';

export type InterrogateEntityType =
  | 'value' | 'priority' | 'goal' | 'interest' | 'experiment' | 'nogo' | 'tension' | 'open_question';

interface InterrogateEntityBase {
  id: InterrogateEntityId;
  confidence: number;
  status: EntityStatus;
  source: string;
  last_reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface InterrogateValue extends InterrogateEntityBase {
  content: string;
  rank: number | null;
}

export interface InterrogateInterest extends InterrogateEntityBase {
  content: string;
  intensity: 'low' | 'medium' | 'high';
  last_engaged_at: string | null;
}

export interface InterrogatePriority extends InterrogateEntityBase {
  content: string;
  rank: number | null;
  serves_value_id: string | null;
  timeframe: string | null;
  verdict: string | null;
}

export type GoalStatus = 'active' | 'hit' | 'missed' | 'abandoned';

export interface InterrogateGoal extends InterrogateEntityBase {
  content: string;
  priority_id: string | null;
  success_criteria: string | null;
  deadline: string | null;
  goal_status: GoalStatus;
}

export type SpawnedFromType = 'value' | 'interest' | 'priority' | 'goal' | 'tension' | 'open_question';

// Note: experiments use `hypothesis`, not `content` — the one field-name
// irregularity across the 8 entity types (see belief-entity.ts normalization).
export interface InterrogateExperiment extends InterrogateEntityBase {
  hypothesis: string;
  window_start: string | null;
  window_end: string | null;
  review_at: string | null;
  verdict: string | null;
  spawned_from_type: SpawnedFromType | null;
  spawned_from_id: string | null;
}

export interface InterrogateNoGo extends InterrogateEntityBase {
  content: string;
  reason: string | null;
  declared_at: string;
}

export type BetweenType = 'value' | 'interest' | 'priority' | 'goal' | 'nogo' | 'open_question';

export interface InterrogateTension extends InterrogateEntityBase {
  content: string;
  resolving_how: string | null;
  between_a_type: BetweenType | null;
  between_a_id: string | null;
  between_b_type: BetweenType | null;
  between_b_id: string | null;
}

export interface InterrogateOpenQuestion extends InterrogateEntityBase {
  content: string;
  raised_at: string;
  resolved_at: string | null;
  resolution: string | null;
}
