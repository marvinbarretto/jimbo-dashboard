import type { ActorId, ProjectId } from '../ids';

// A project is a long-lived context that vault items belong to.
// Its primary job is to be the canonical home for domain criteria — the
// "what qualifies as X" rules that agents need to act correctly on items in its scope.
// Without this, criteria floats in the operator's head and agents can't reason.

// Two states. Fewer options = easier to reason about.
// `archived` is soft-delete (hidden from default views). "Paused" projects stay `active` —
// the fact that nothing is moving forward on them is already visible via item counts.
export type ProjectStatus = 'active' | 'archived';

export interface Project {
  id:             ProjectId;                // slug: 'localshout', 'jimbo-hermes', 'nz-passport'
  display_name:   string;
  description:    string | null;            // one-liner shown in lists
  status:         ProjectStatus;

  // The actor who initiated the project and carries responsibility.
  // Most projects today are owned by marvin; future: jimbo can own prototypes it spawns.
  // Ownership is an identity, not a role — keeps the Actor abstraction honest.
  owner_actor_id: ActorId;

  // Freeform markdown: goals, domain rules, what qualifies, stakeholders, anything an
  // agent working on this project's items needs to know. Structured breakdown deferred
  // until the shape stabilises (whiteboard row 18).
  criteria:       string | null;

  // Where this project's code and skills live. Used by the (future) skill federation layer
  // to discover project-scoped skills. Null for lightweight/prototype projects with no repo.
  repo_url:       string | null;

  created_at:     string;
  // `updated_at` omitted — derived from activity events when we model project-level events.
  // Principle P6: no silent field writes.
}

export type CreateProjectPayload = Omit<Project, 'created_at'>;
export type UpdateProjectPayload = Partial<Omit<Project, 'id' | 'created_at'>>;
