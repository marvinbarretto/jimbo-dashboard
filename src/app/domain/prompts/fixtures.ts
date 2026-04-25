import type { Prompt } from './prompt';
import type { PromptVersion } from './prompt-version';
import { promptId, promptVersionId } from '../ids';

// Each Skill in `domain/skills/fixtures.ts` references one of these prompts.
// Versions are immutable (P6); promotion flips `current_version_id`.

const PV_INTAKE_QUALITY_V1 = promptVersionId('a0000001-0001-0001-0001-000000000001');
const PV_VAULT_CLASSIFY_V1 = promptVersionId('a0000002-0001-0001-0001-000000000001');
const PV_VAULT_DECOMPOSE_V1 = promptVersionId('a0000003-0001-0001-0001-000000000001');
const PV_EVENT_QUALIFIER_V1 = promptVersionId('a0000004-0001-0001-0001-000000000001');
// Second version on intake-quality demonstrates the promotion model.
const PV_INTAKE_QUALITY_V2 = promptVersionId('a0000001-0002-0002-0002-000000000002');

export const PROMPTS = [
  {
    id: promptId('intake-quality'),
    display_name: 'Intake quality',
    description: 'Decides if a freshly captured note has enough information to act on.',
    current_version_id: PV_INTAKE_QUALITY_V2,
    is_active: true,
    created_at: '2026-04-12T09:00:00Z',
    updated_at: '2026-04-22T09:00:00Z',
  },
  {
    id: promptId('vault-classify'),
    display_name: 'Vault classify',
    description: 'Sets ai_priority + rationale on accepted items.',
    current_version_id: PV_VAULT_CLASSIFY_V1,
    is_active: true,
    created_at: '2026-04-14T09:00:00Z',
    updated_at: '2026-04-14T09:00:00Z',
  },
  {
    id: promptId('vault-decompose'),
    display_name: 'Vault decompose',
    description: 'Drafts acceptance criteria + subtasks for classified items.',
    current_version_id: PV_VAULT_DECOMPOSE_V1,
    is_active: true,
    created_at: '2026-04-16T09:00:00Z',
    updated_at: '2026-04-16T09:00:00Z',
  },
  {
    id: promptId('event-qualifier'),
    display_name: 'Event qualifier',
    description: 'Decides whether candidate event HTML meets LocalShout criteria.',
    current_version_id: PV_EVENT_QUALIFIER_V1,
    is_active: true,
    created_at: '2026-04-20T09:00:00Z',
    updated_at: '2026-04-20T09:00:00Z',
  },
] as const satisfies readonly Prompt[];

export const PROMPT_VERSIONS = [
  {
    id: PV_INTAKE_QUALITY_V1,
    prompt_id: promptId('intake-quality'),
    version: 1,
    system_content:
      'You are an intake gatekeeper. Read the note body and decide whether it is actionable.',
    user_content: null,
    notes: 'initial draft',
    input_schema:  { type: 'object', properties: { body: { type: 'string' } }, required: ['body'] },
    output_schema: {
      type: 'object',
      properties: {
        actionability: { enum: ['clear', 'needs-breakdown', 'vague'] },
        questions: { type: 'array', items: { type: 'string' } },
      },
      required: ['actionability'],
    },
    parent_version_id: null,
    created_at: '2026-04-12T09:00:00Z',
  },
  {
    id: PV_INTAKE_QUALITY_V2,
    prompt_id: promptId('intake-quality'),
    version: 2,
    system_content:
      'You are an intake gatekeeper. Read the note body and decide actionability. ' +
      'If vague, ask up to 3 specific clarifying questions in the operator\'s voice.',
    user_content: null,
    notes: 'tightened question count, added voice constraint',
    input_schema:  { type: 'object', properties: { body: { type: 'string' } }, required: ['body'] },
    output_schema: {
      type: 'object',
      properties: {
        actionability: { enum: ['clear', 'needs-breakdown', 'vague'] },
        questions: { type: 'array', items: { type: 'string' }, maxItems: 3 },
      },
      required: ['actionability'],
    },
    parent_version_id: PV_INTAKE_QUALITY_V1,
    created_at: '2026-04-22T09:00:00Z',
  },
  {
    id: PV_VAULT_CLASSIFY_V1,
    prompt_id: promptId('vault-classify'),
    version: 1,
    system_content:
      'Score the note on the integer priority scale 0-3 (0=urgent, 3=low). ' +
      'Provide a one-sentence rationale and a confidence score 0-1.',
    user_content: null,
    notes: null,
    input_schema:  { type: 'object', properties: { body: { type: 'string' } }, required: ['body'] },
    output_schema: {
      type: 'object',
      properties: {
        ai_priority: { type: 'integer', minimum: 0, maximum: 3 },
        priority_confidence: { type: 'number', minimum: 0, maximum: 1 },
        ai_rationale: { type: 'string' },
      },
      required: ['ai_priority', 'priority_confidence', 'ai_rationale'],
    },
    parent_version_id: null,
    created_at: '2026-04-14T09:00:00Z',
  },
  {
    id: PV_VAULT_DECOMPOSE_V1,
    prompt_id: promptId('vault-decompose'),
    version: 1,
    system_content:
      'Read the body and produce 1-5 acceptance criteria. Each criterion must be testable.',
    user_content: null,
    notes: null,
    input_schema:  { type: 'object', properties: { body: { type: 'string' } }, required: ['body'] },
    output_schema: {
      type: 'object',
      properties: {
        acceptance_criteria: { type: 'array', items: { type: 'string' } },
        subtasks: { type: 'array', items: { type: 'string' } },
      },
      required: ['acceptance_criteria'],
    },
    parent_version_id: null,
    created_at: '2026-04-16T09:00:00Z',
  },
  {
    id: PV_EVENT_QUALIFIER_V1,
    prompt_id: promptId('event-qualifier'),
    version: 1,
    system_content:
      'Given event HTML, return whether it qualifies for LocalShout per the project criteria.',
    user_content: null,
    notes: null,
    input_schema:  { type: 'object', properties: { html: { type: 'string' } }, required: ['html'] },
    output_schema: {
      type: 'object',
      properties: {
        qualifies: { type: 'boolean' },
        reasons: { type: 'array', items: { type: 'string' } },
      },
      required: ['qualifies'],
    },
    parent_version_id: null,
    created_at: '2026-04-20T09:00:00Z',
  },
] as const satisfies readonly PromptVersion[];
