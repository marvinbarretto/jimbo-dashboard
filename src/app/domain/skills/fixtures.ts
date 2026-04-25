import type { Skill } from './skill';
import type { SkillTool } from './skill-tool';
import { projectId, promptId, skillId, toolId } from '../ids';

// Skills referenced by ACTOR_SKILLS, dispatch entries, and the activity narrative.
// Slugs are project-prefixed (K10). `prompt_id` left null — prompts not modelled yet.

export const SKILLS = [
  {
    id: skillId('hermes/intake-quality'),
    display_name: 'Intake quality',
    description: 'Gatekeeper. Reads body, decides actionability, posts questions if vague.',
    prompt_id: promptId('intake-quality'),
    model_hint: 'budget',
    input_schema: { type: 'object', properties: { body: { type: 'string' } }, required: ['body'] },
    output_schema: {
      type: 'object',
      properties: {
        actionability: { enum: ['clear', 'needs-breakdown', 'vague'] },
        questions: { type: 'array', items: { type: 'string' } },
      },
      required: ['actionability'],
    },
    source_repo: projectId('hermes'),
    last_indexed_at: '2026-04-24T08:00:00Z',
    is_active: true,
    created_at: '2026-04-12T09:00:00Z',
  },
  {
    id: skillId('hermes/vault-classify'),
    display_name: 'Vault classify',
    description: 'Sets ai_priority, priority_confidence, and ai_rationale on accepted items.',
    prompt_id: promptId('vault-classify'),
    model_hint: 'standard',
    input_schema: { type: 'object', properties: { body: { type: 'string' } }, required: ['body'] },
    output_schema: {
      type: 'object',
      properties: {
        ai_priority: { type: 'integer', minimum: 0, maximum: 3 },
        priority_confidence: { type: 'number', minimum: 0, maximum: 1 },
        ai_rationale: { type: 'string' },
      },
      required: ['ai_priority', 'priority_confidence', 'ai_rationale'],
    },
    source_repo: projectId('hermes'),
    last_indexed_at: '2026-04-24T08:00:00Z',
    is_active: true,
    created_at: '2026-04-14T09:00:00Z',
  },
  {
    id: skillId('hermes/vault-decompose'),
    display_name: 'Vault decompose',
    description: 'Drafts acceptance criteria and subtasks for classified items.',
    prompt_id: promptId('vault-decompose'),
    model_hint: 'standard',
    input_schema: { type: 'object', properties: { body: { type: 'string' } }, required: ['body'] },
    output_schema: {
      type: 'object',
      properties: {
        acceptance_criteria: { type: 'array', items: { type: 'string' } },
        subtasks: { type: 'array', items: { type: 'string' } },
      },
      required: ['acceptance_criteria'],
    },
    source_repo: projectId('hermes'),
    last_indexed_at: '2026-04-24T08:00:00Z',
    is_active: true,
    created_at: '2026-04-16T09:00:00Z',
  },
  {
    id: skillId('localshout/event-qualifier'),
    display_name: 'Event qualifier',
    description: 'Decides whether a candidate event meets LocalShout criteria.',
    prompt_id: promptId('event-qualifier'),
    model_hint: 'budget',
    input_schema: { type: 'object', properties: { html: { type: 'string' } }, required: ['html'] },
    output_schema: {
      type: 'object',
      properties: {
        qualifies: { type: 'boolean' },
        reasons: { type: 'array', items: { type: 'string' } },
      },
      required: ['qualifies'],
    },
    source_repo: projectId('localshout'),
    last_indexed_at: null,
    is_active: true,
    created_at: '2026-04-20T09:00:00Z',
  },
] as const satisfies readonly Skill[];

// Skill ↔ Tool junctions. Two skills currently use tools:
//   - event-qualifier needs `fetch-url` to retrieve event HTML before classifying
//   - intake-quality (v2) optionally uses `gmail-search` to find original context
export const SKILL_TOOLS = [
  { skill_id: skillId('localshout/event-qualifier'), tool_id: toolId('fetch-url') },
  { skill_id: skillId('hermes/intake-quality'),      tool_id: toolId('gmail-search') },
] as const satisfies readonly SkillTool[];
