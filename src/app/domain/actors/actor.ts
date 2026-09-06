import type { ActorId } from '../ids';
import type { SkillCapability } from '../capability';

// An actor is anyone or anything that can take an action on a vault item.
// Today that's marvin (human), kipper (local llm), boris (hosted llm), jimbo (orchestrator).
// Tomorrow it might be a second human, a different local model, a scheduled cron.
// The shape is deliberately minimal — identity, nothing operational.
// Live status (is kipper reachable right now?) belongs elsewhere, not on the identity row.
//
// Convention for system-originated events: `jimbo` is the actor of record.
// When an item is created by gmail intake, a scheduled cron, or any automated path
// with no specific human or agent driving it, `actor_id = 'jimbo'`. Hermes is a
// project, not an actor; jimbo is the identity that executes from the hermes
// codebase (whiteboard P13). This avoids reviving a bare `system` row and keeps
// `activity_events.actor_id` non-null at the schema level.

export type ActorKind = 'human' | 'agent' | 'system';

export interface Actor {
  id: ActorId;                  // slug: 'marvin', 'kipper', 'boris', 'jimbo'
  display_name: string;
  kind: ActorKind;
  // Free text: what this actor does, where it runs, constraints, quirks. This is
  // the only place that says where the work happens — a single `runtime` enum was
  // dropped 2026-09-06 because an actor can hold lanes on more than one machine,
  // and the fleet page derives machines and liveness from heartbeats anyway.
  description: string | null;
  is_active: boolean;
  // High-level capability declaration. Dispatch is allowed when
  // serves ⊇ skill.requires. A claim, not a derivation — operator-maintained,
  // stable across specific model upgrades as long as the actor still reaches
  // some model in each capability class.
  serves: SkillCapability[];
  created_at: string;
  updated_at: string;
}

export type CreateActorPayload = Omit<Actor, 'created_at' | 'updated_at'>;
export type UpdateActorPayload = Partial<Omit<Actor, 'id' | 'created_at' | 'updated_at'>>;
