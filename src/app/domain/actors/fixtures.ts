import type { Actor } from './actor';
import type { ActorSkill } from './actor-skill';
import { actorId, skillId } from '../ids';

// Hand-written fixtures. `satisfies` ensures any shape drift fails the build.
// Skill slugs match `domain/skills/fixtures.ts` — every entry is project-prefixed (K10).

export const ACTORS = [
  {
    id: actorId('marvin'),
    display_name: 'Marvin',
    kind: 'human',
    runtime: null,
    description: 'The operator. Final say on priority, acceptance, and direction.',
    is_active: true,
    serves: [],
    created_at: '2026-04-24T00:00:00Z',
    updated_at: '2026-04-24T00:00:00Z',
  },
  {
    id: actorId('ralph'),
    display_name: 'Ralph',
    kind: 'agent',
    runtime: 'ollama',
    description: 'Local 7B-class model on 24GB RAM. Junior tasks: classification, reassigns, acceptance-criteria drafts, subticket spawning.',
    is_active: true,
    serves: ['fast', 'local-only'],
    created_at: '2026-04-24T00:00:00Z',
    updated_at: '2026-04-24T00:00:00Z',
  },
  {
    id: actorId('boris'),
    display_name: 'Boris',
    kind: 'agent',
    runtime: 'anthropic',
    description: 'VPS-hosted loop. Polls every 5 minutes for dispatched work. Selects its own Sonnet-class model per run.',
    is_active: true,
    serves: ['frontier', 'fast', 'vision', 'long-context', 'cloud-only'],
    created_at: '2026-04-24T00:00:00Z',
    updated_at: '2026-04-24T00:00:00Z',
  },
  {
    id: actorId('jimbo'),
    display_name: 'Jimbo',
    kind: 'agent',
    runtime: 'hermes',
    description: 'Hermes orchestrator. Telegram-facing. Coordinates the ceremony: routes work, reviews output, escalates to marvin.',
    is_active: true,
    serves: ['frontier', 'fast', 'long-context', 'cloud-only'],
    created_at: '2026-04-24T00:00:00Z',
    updated_at: '2026-04-24T00:00:00Z',
  },
] as const satisfies readonly Actor[];

// Per-skill proficiency hints layered on top of capability matching. Capability
// (skill.requires ↔ actor.serves) tells you who CAN. This table tells you who's
// PREFERRED, CAPABLE, or EXPERIMENTAL among them. Optional — dispatch works
// without it; this is a routing weight, not a hard gate.
export const ACTOR_SKILLS = [
  { actor_id: actorId('ralph'), skill_id: skillId('vault-grooming/analyse'),   proficiency: 'capable',      created_at: '2026-04-24T00:00:00Z' },
  { actor_id: actorId('ralph'), skill_id: skillId('vault-grooming/decompose'), proficiency: 'capable',      created_at: '2026-04-24T00:00:00Z' },

  { actor_id: actorId('boris'), skill_id: skillId('vault-grooming/analyse'),   proficiency: 'preferred',    created_at: '2026-04-24T00:00:00Z' },
  { actor_id: actorId('boris'), skill_id: skillId('vault-grooming/decompose'), proficiency: 'preferred',    created_at: '2026-04-24T00:00:00Z' },
  { actor_id: actorId('boris'), skill_id: skillId('code/pr-from-issue'),       proficiency: 'preferred',    created_at: '2026-04-24T00:00:00Z' },
] as const satisfies readonly ActorSkill[];
