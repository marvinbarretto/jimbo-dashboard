import type { ProjectId, PromptId, SkillId } from '../ids';
import type { ModelTier } from '../models';

// A skill is a named, dispatchable capability — the unit the router picks when work needs doing.
// "Micro-skill decomposition" (principle P1): prefer many small skills over one big one. A skill
// should do one checkable thing with a clear input/output contract.
//
// This type supersedes the legacy `features/skills/utils/skill.types.ts` which was operator-grade
// scaffolding. Legacy will be migrated when the Skill feature is next implemented.

// Skills carry a `model_hint` of type `ModelTier`. Tier is defined canonically in
// `domain/models/model.ts` (shared with the Model entity). Re-exported here for the
// historical import path; new code should import directly from `domain/models`.
export type { ModelTier };

export interface Skill {
  // Slug is always prefixed: `{project-id}/{skill-name}`. No "bare = global" ambiguity —
  // every skill belongs to exactly one project. The core project that owns hermes-level
  // skills (`intake-quality`, `decomposer`, etc.) is named `hermes`.
  // Invariant: the prefix portion equals `source_repo`. Enforced at write time.
  id:               SkillId;

  display_name:     string;
  description:      string | null;   // human-readable — what this skill does

  // Content — what the LLM is told to do.
  // Nullable because pure-code skills exist (e.g. `extract-events-from-html` could be a
  // deterministic parser with no LLM call).
  prompt_id:        PromptId | null;

  // Routing signal for the dispatcher. Not a hard cap — higher tiers are allowed if
  // cheap is unavailable.
  model_hint:       ModelTier;

  // JSON Schemas. Dashboard stores them as a cache; repo is source of truth (see `last_indexed_at`).
  // `unknown` at TS level — validated at runtime by the dispatcher before invoking.
  input_schema:     unknown;
  output_schema:    unknown;

  // Which project owns this skill's code. FK — must equal the slug's prefix portion.
  // Indexer reads project.repo_url to discover skills at `{repo}/skills/*`.
  source_repo:      ProjectId;

  // Cache freshness — when the indexer last read this skill's files from the repo.
  // Null = never indexed (manual entry or pre-indexer). UI surfaces staleness.
  last_indexed_at:  string | null;

  is_active:        boolean;
  created_at:       string;
  // No `updated_at` — principle K6. Change history via events, not field-flip.
}

export type CreateSkillPayload = Omit<Skill, 'created_at'>;
export type UpdateSkillPayload = Partial<Omit<Skill, 'id' | 'created_at'>>;

// Parses the project prefix from a skill slug. Every skill is prefixed —
// returns null only if the slug is malformed (no slash).
export function skillNamespace(id: SkillId): string | null {
  const slash = (id as string).indexOf('/');
  return slash === -1 ? null : (id as string).slice(0, slash);
}

// Strips the prefix — returns just the skill's local name.
//   skillLocalName('localshout/event-qualifier' as SkillId) === 'event-qualifier'
export function skillLocalName(id: SkillId): string {
  const slash = (id as string).indexOf('/');
  return slash === -1 ? (id as string) : (id as string).slice(slash + 1);
}
