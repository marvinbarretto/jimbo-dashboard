import type { ActorId } from '../ids';

// An actor is anyone or anything that can take an action on a vault item.
// Today that's marvin (human), ralph (local llm), boris (hosted llm), jimbo (orchestrator).
// Tomorrow it might be a second human, a different local model, a scheduled cron.
// The shape is deliberately minimal — identity + routing hint, nothing operational.
// Live status (is ralph reachable right now?) belongs elsewhere, not on the identity row.
//
// Convention for system-originated events: `jimbo` is the actor of record.
// When an item is created by gmail intake, a scheduled cron, or any automated path
// with no specific human or agent driving it, `actor_id = 'jimbo'`. Hermes is a
// project, not an actor; jimbo is the identity that executes from the hermes
// codebase (whiteboard P13). This avoids reviving a bare `system` row and keeps
// `activity_events.actor_id` non-null at the schema level.

export type ActorKind = 'human' | 'agent' | 'system';

// Where the actor's work actually runs. Null for humans.
// 'hermes' covers the orchestrator itself; agents hosted inside hermes inherit its runtime.
export type ActorRuntime = 'ollama' | 'anthropic' | 'openrouter' | 'hermes' | null;

export interface Actor {
  id: ActorId;                  // slug: 'marvin', 'ralph', 'boris', 'jimbo'
  display_name: string;
  kind: ActorKind;
  runtime: ActorRuntime;
  description: string | null;   // free text: what this actor does, constraints, quirks
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type CreateActorPayload = Omit<Actor, 'created_at' | 'updated_at'>;
export type UpdateActorPayload = Partial<Omit<Actor, 'id' | 'created_at' | 'updated_at'>>;
