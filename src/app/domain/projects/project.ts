import type { ActorId, ProjectId } from '../ids';

// A project is a long-lived context that vault items belong to.
// Its primary job is to be the canonical home for domain criteria — the
// "what qualifies as X" rules that agents need to act correctly on items in its scope.
// Without this, criteria floats in the operator's head and agents can't reason.

// Two states. Fewer options = easier to reason about.
// `archived` is soft-delete (hidden from default views). "Paused" projects stay `active` —
// the fact that nothing is moving forward on them is already visible via item counts.
export type ProjectStatus = 'active' | 'archived';

// Scope of the project.
//   'major' = permanent, long-running (e.g. localshout, jimbo-hermes)
//   'minor' = time-boxed, 1–6 months (e.g. nz-passport-renewal)
export type ProjectKind = 'major' | 'minor';

// How much agents may do on this project's tasks without a human in the loop.
// Null = inherit the global default at dispatch time.
//   'none'    = read-only; agents must not write
//   'propose' = agents prepare changes for human approval
//   'ship'    = agents may land changes directly
export type ProjectAutonomyLevel = 'none' | 'propose' | 'ship';

// Structured brief — one block of context every project should carry, surfaced
// on the detail page and injected into Boris/Ralph context. All optional so
// projects can be richer or poorer without ceremony.
export interface ProjectBrief {
  intent:           string | null;  // one-line north star
  personas:         string | null;  // who this project serves
  success_criteria: string | null;  // what "done" looks like
  current_state:    string | null;  // where things are now
  out_of_scope:     string | null;  // explicit exclusions
  key_resources:    string | null;  // links, docs, references (markdown)
  entry_points:     string | null;  // "start reading here" — files or doc links
  deploy_target:    string | null;  // how it ships, where it runs
  observability:    string | null;  // logs / metrics / dashboards
  conventions_url:  string | null;  // link to AGENTS.md / CLAUDE.md / style guide
  footguns:         string | null;  // known gotchas a newcomer would trip on
  autonomy_level:   ProjectAutonomyLevel | null;
  current_blocker:  string | null;  // what is currently blocking progress
  common_tasks:     string | null;  // templated entry points (markdown list)
}

export interface Project extends ProjectBrief {
  id:             ProjectId;                // slug: 'localshout', 'jimbo-hermes', 'nz-passport'
  display_name:   string;
  description:    string | null;            // one-liner shown in lists
  status:         ProjectStatus;
  kind:           ProjectKind;

  // The actor who initiated the project and carries responsibility.
  // Nullable to mirror the API contract (`z.string().nullable()`); the
  // service used to silently relabel null as 'marvin', which masqueraded
  // as a real owner. Consumers should handle null explicitly.
  owner_actor_id: ActorId | null;

  // Freeform markdown: goals, domain rules, what qualifies, stakeholders, anything an
  // agent working on this project's items needs to know. Predates the structured
  // brief; kept for now so existing content survives. New context should land in
  // brief fields (success_criteria, current_state, etc.) instead.
  criteria:       string | null;

  // Where this project's code and skills live. Used by the (future) skill federation layer
  // to discover project-scoped skills. Null for lightweight/prototype projects with no repo.
  repo_url:       string | null;

  // CSS color string (hex, hsl, etc.) applied as an accent throughout the UI.
  // Auto-assigned from PROJECT_PALETTE on create; operator can override via project form.
  color_token:    string | null;

  created_at:     string;
  // `updated_at` omitted — derived from activity events when we model project-level events.
  // Principle P6: no silent field writes.
}

// Brief fields are optional on the wire (API treats them as nullable optional)
// and stay optional here so callers don't have to spread defaults for every
// project they create. The service fills missing brief slots with null when
// building the optimistic Project record.
export type CreateProjectPayload =
  & Omit<Project, 'created_at' | keyof ProjectBrief>
  & Partial<ProjectBrief>;

export type UpdateProjectPayload = Partial<Omit<Project, 'id' | 'created_at'>>;

// Convenience for fixtures and ad-hoc Project literals: spread this to fill
// all brief slots with null. Keeps test data terse without making the brief
// fields optional on the domain type.
export const EMPTY_PROJECT_BRIEF: ProjectBrief = {
  intent:           null,
  personas:         null,
  success_criteria: null,
  current_state:    null,
  out_of_scope:     null,
  key_resources:    null,
  entry_points:     null,
  deploy_target:    null,
  observability:    null,
  conventions_url:  null,
  footguns:         null,
  autonomy_level:   null,
  current_blocker:  null,
  common_tasks:     null,
};
