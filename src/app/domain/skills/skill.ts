// A skill is the dispatchable unit jimbo-api looks up when an enqueue arrives.
// The canonical source is `hub/skills/<category>/<name>/SKILL.md` (filesystem;
// jimbo-api reads from $HUB_SKILLS_DIR). The shape mirrors the Anthropic Claude
// Code Skill schema so the same files validate cleanly in Claude tooling, with
// orchestration-specific fields nested under `metadata`.
//
// Phase B slice 2 dropped the legacy DB-backed shape (display_name, model_hint,
// prompt_id, source_repo, last_indexed_at, etc.) — those fields disappeared
// when the wrong-turn skills/prompts/tools/models tables were removed.

export interface SkillMetadata {
  // Actor IDs allowed to dispatch this skill. Enforced by jimbo-api's gate.
  executors: string[];
  timeout_minutes?: number;
  required_context?: string[];
  produces?: string[];
  completes_dispatch?: boolean;
  // Defaults to true. Set false to keep the file but block dispatch.
  is_active?: boolean;
}

export interface Skill {
  // Slash-path matching the directory under hub/skills/.
  // e.g. 'vault-grooming/analyse', 'code/pr-from-issue'.
  id: string;
  name: string;
  description: string;
  metadata: SkillMetadata;
  // Markdown body after the frontmatter — the agent's prompt.
  body: string;
}

// Slash-path helpers. The id is always two segments by registry convention.
export function skillNamespace(id: string): string | null {
  const slash = id.indexOf('/');
  return slash === -1 ? null : id.slice(0, slash);
}

export function skillLocalName(id: string): string {
  const slash = id.indexOf('/');
  return slash === -1 ? id : id.slice(slash + 1);
}
