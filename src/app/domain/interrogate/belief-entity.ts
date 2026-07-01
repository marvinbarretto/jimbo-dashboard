// Uniform view over the 8 belief-entity types for the Beliefs tab — a single
// card component renders all of them, so the type-specific extras (rank,
// timeframe, goal_status, hypothesis vs content, ...) are dropped here and
// only the fields every type shares are kept. `raw` retains the original
// row for anywhere that needs a type-specific field later.
import type { InterrogateEntityId } from '@domain/ids';
import type {
  InterrogateEntityType, EntityStatus,
  InterrogateValue, InterrogateInterest, InterrogatePriority, InterrogateGoal,
  InterrogateExperiment, InterrogateNoGo, InterrogateTension, InterrogateOpenQuestion,
} from './interrogate-entity';

export type AnyInterrogateEntity =
  | InterrogateValue | InterrogateInterest | InterrogatePriority | InterrogateGoal
  | InterrogateExperiment | InterrogateNoGo | InterrogateTension | InterrogateOpenQuestion;

export interface BeliefEntity {
  entityType: InterrogateEntityType;
  id: InterrogateEntityId;
  content: string;
  confidence: number;
  status: EntityStatus;
  source: string;
  last_reviewed_at: string | null;
  raw: AnyInterrogateEntity;
}

// REST path segment per entity type — the 8 routes differ only by this
// (mirrors jimbo-api's own ENTITY_TABLES/DISPATCHERS maps).
export const ENTITY_TYPE_SEGMENT: Record<InterrogateEntityType, string> = {
  value: 'values',
  priority: 'priorities',
  goal: 'goals',
  interest: 'interests',
  experiment: 'experiments',
  nogo: 'nogos',
  tension: 'tensions',
  open_question: 'open-questions',
};

export const ENTITY_TYPE_LABEL: Record<InterrogateEntityType, string> = {
  value: 'Values',
  priority: 'Priorities',
  goal: 'Goals',
  interest: 'Interests',
  experiment: 'Experiments',
  nogo: 'No-gos',
  tension: 'Tensions',
  open_question: 'Open Questions',
};

// entity_type key -> the array key it lives under in SnapshotResponse.
export const ENTITY_TYPE_SNAPSHOT_KEY: Record<InterrogateEntityType, string> = {
  value: 'values',
  priority: 'priorities',
  goal: 'goals',
  interest: 'interests',
  experiment: 'experiments',
  nogo: 'nogos',
  tension: 'tensions',
  open_question: 'open_questions',
};

export function normalizeBeliefEntity(entityType: InterrogateEntityType, raw: AnyInterrogateEntity): BeliefEntity {
  return {
    entityType,
    id: raw.id,
    content: entityType === 'experiment' ? (raw as InterrogateExperiment).hypothesis : (raw as { content: string }).content,
    confidence: raw.confidence,
    status: raw.status,
    source: raw.source,
    last_reviewed_at: raw.last_reviewed_at,
    raw,
  };
}

// Patch shape accepted by InterrogateEntityService.update() — normalized to
// `content`; mapped back to `hypothesis` for experiments at the write boundary.
export interface BeliefContentPatch {
  content: string;
}
