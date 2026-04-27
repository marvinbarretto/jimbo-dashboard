// Seed skills/prompts/tools/models/model_stacks into jimbo_pg.
//
// Idempotent — TRUNCATE first then INSERT. Run after migration 0007.
// One source of truth lives here. To add a skill: edit this file, re-run.
//
//   ssh -L 5433:127.0.0.1:5432 vps -N
//   node --env-file=.env --import tsx scripts/seed-skills-registry.ts
//
// Phase 3 part 1 of Phase C — entity model for agent dispatch.
// Skill IDs are flat slugs (no slashes). Old dispatch_queue.skill values
// with slashes get rewritten to flat slugs in a follow-up step.

import { sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import {
  models, modelStacks, prompts, promptVersions, tools, skills,
} from '../db/schema/index.js';

async function main() {
  console.log('[seed] truncating registry tables…');
  // Order matters: skills references prompts + model_stacks; prompt_versions
  // references prompts; model_stacks references models.
  await db.execute(sql`TRUNCATE skills, prompt_versions, prompts, tools, model_stacks, models RESTART IDENTITY CASCADE`);

  // ── models ──────────────────────────────────────────────────────────────
  console.log('[seed] models');
  await db.insert(models).values([
    { id: 'claude-opus-4-7',   display_name: 'Claude Opus 4.7',   provider: 'anthropic', notes: 'Top-tier reasoning. $15/$75 per MTok.' },
    { id: 'claude-sonnet-4-6', display_name: 'Claude Sonnet 4.6', provider: 'anthropic', notes: 'Workhorse. $3/$15 per MTok.' },
    { id: 'claude-haiku-4-5',  display_name: 'Claude Haiku 4.5',  provider: 'anthropic', notes: 'Fast tier. $1/$5 per MTok.' },
  ]);

  // ── model_stacks ────────────────────────────────────────────────────────
  console.log('[seed] model_stacks');
  await db.insert(modelStacks).values([
    {
      id: 'standard',
      display_name: 'Standard',
      description: 'Sonnet primary, Haiku fast fallback. Default for most skills.',
      model_ids: ['claude-sonnet-4-6'],
      fast_model_id: 'claude-haiku-4-5',
    },
    {
      id: 'reasoning',
      display_name: 'Reasoning',
      description: 'Opus primary for hard reasoning, Sonnet fast fallback.',
      model_ids: ['claude-opus-4-7'],
      fast_model_id: 'claude-sonnet-4-6',
    },
    {
      id: 'fast-only',
      display_name: 'Fast only',
      description: 'Haiku for cheap classification / triage turns.',
      model_ids: ['claude-haiku-4-5'],
      fast_model_id: 'claude-haiku-4-5',
    },
  ]);

  // ── tools ───────────────────────────────────────────────────────────────
  // Initial palette covering vault grooming. Phase 4 (Boris runner) will
  // implement these as HTTP handlers. Kept minimal — extending is cheap.
  console.log('[seed] tools');
  await db.insert(tools).values([
    {
      id: 'read_vault_note',
      display_name: 'Read vault note',
      description: 'Fetch a vault note by id. Returns title, body, status, and metadata.',
      handler_type: 'http',
      endpoint_url: '/api/vault/notes/:id',
      input_schema: {
        type: 'object',
        properties: { note_id: { type: 'string', description: 'Vault note ID' } },
        required: ['note_id'],
      },
    },
    {
      id: 'submit_intake',
      display_name: 'Submit intake quality verdict',
      description: 'Record an intake-quality verdict for a vault note. Closes the dispatch.',
      handler_type: 'http',
      endpoint_url: '/api/grooming/submit-intake',
      input_schema: {
        type: 'object',
        properties: {
          note_id: { type: 'string' },
          actionability: { enum: ['clear', 'needs-breakdown', 'vague'] },
          questions: { type: 'array', items: { type: 'object', properties: { q: { type: 'string' }, why: { type: 'string' } } } },
        },
        required: ['note_id', 'actionability'],
      },
    },
    {
      id: 'submit_classification',
      display_name: 'Submit classification',
      description: 'Record priority/confidence/tags/rationale for a classified vault note.',
      handler_type: 'http',
      endpoint_url: '/api/grooming/submit-classification',
      input_schema: {
        type: 'object',
        properties: {
          note_id: { type: 'string' },
          ai_priority: { type: 'integer', minimum: 0, maximum: 3 },
          priority_confidence: { type: 'number', minimum: 0, maximum: 1 },
          tags: { type: 'array', items: { type: 'string' } },
          ai_rationale: { type: 'string' },
        },
        required: ['note_id', 'ai_priority', 'priority_confidence', 'tags', 'ai_rationale'],
      },
    },
    {
      id: 'propose_decomposition',
      display_name: 'Propose decomposition',
      description: 'Submit a decomposition of a parent note into subtasks with AC.',
      handler_type: 'http',
      endpoint_url: '/api/grooming/submit-decomposition',
      input_schema: {
        type: 'object',
        properties: {
          note_id: { type: 'string' },
          subtasks: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                body: { type: 'string' },
                acceptance_criteria: { type: 'string' },
              },
              required: ['title', 'acceptance_criteria'],
            },
          },
          rationale: { type: 'string' },
        },
        required: ['note_id', 'subtasks', 'rationale'],
      },
    },
  ]);

  // ── prompts (one per skill, with v1 placeholder) ─────────────────────────
  console.log('[seed] prompts + prompt_versions');
  type PromptSeed = { id: string; display_name: string; system_content: string };
  const promptSeeds: PromptSeed[] = [
    {
      id: 'p-vault-grooming-analyse',
      display_name: 'Vault grooming · analyse',
      system_content:
        'TODO: define intake-quality analysis system prompt. ' +
        'The model should read a vault note and decide whether it is clear, needs-breakdown, or vague, ' +
        'then optionally produce clarifying questions. Submit via the submit_intake tool.',
    },
    {
      id: 'p-vault-grooming-classify',
      display_name: 'Vault grooming · classify',
      system_content:
        'TODO: define classification system prompt. ' +
        'Read the note, assign priority 0-3, confidence 0-1, relevant tags, and a one-paragraph rationale. ' +
        'Submit via submit_classification.',
    },
    {
      id: 'p-vault-grooming-decompose',
      display_name: 'Vault grooming · decompose',
      system_content:
        'TODO: define decomposition system prompt. ' +
        'Read the parent note, propose 2-5 subtasks each with title and acceptance_criteria. ' +
        'Submit via propose_decomposition.',
    },
    {
      id: 'p-code-pr-from-issue',
      display_name: 'Code · PR from issue',
      system_content: 'TODO: define PR-from-issue execution prompt.',
    },
    {
      id: 'p-research-structured-investigation',
      display_name: 'Research · structured investigation',
      system_content: 'TODO: define structured-investigation prompt.',
    },
    {
      id: 'p-write-draft-doc',
      display_name: 'Write · draft doc',
      system_content: 'TODO: define draft-doc prompt.',
    },
  ];

  for (const p of promptSeeds) {
    await db.insert(prompts).values({
      id: p.id,
      display_name: p.display_name,
      description: 'Auto-seeded placeholder. Edit content in prompt_versions and bump current_version_id.',
    });
    const [version] = await db.insert(promptVersions).values({
      prompt_id: p.id,
      // version omitted — trigger assigns 1
      version: 0, // 0 triggers auto-assign in set_prompt_version()
      system_content: p.system_content,
      notes: 'v1 placeholder — replace with real content',
    }).returning();
    await db.update(prompts).set({ current_version_id: version.id }).where(sql`${prompts.id} = ${p.id}`);
  }

  // ── skills (the 5 dispatch path-strings, flat-slug renamed) ─────────────
  console.log('[seed] skills');
  await db.insert(skills).values([
    {
      id: 'vault-grooming-analyse',
      display_name: 'Analyse intake quality',
      description: 'Read a new vault note, decide actionability, generate clarifying questions if vague.',
      kind: 'groom',
      prompt_id: 'p-vault-grooming-analyse',
      model_stack_id: 'standard',
      allowed_executors: ['boris', 'ralph'],
      tool_ids: ['read_vault_note', 'submit_intake'],
    },
    {
      id: 'vault-grooming-classify',
      display_name: 'Classify vault note',
      description: 'Assign priority, confidence, tags, and rationale to an intake-complete note.',
      kind: 'classify',
      prompt_id: 'p-vault-grooming-classify',
      model_stack_id: 'standard',
      allowed_executors: ['boris', 'ralph'],
      tool_ids: ['read_vault_note', 'submit_classification'],
    },
    {
      id: 'vault-grooming-decompose',
      display_name: 'Decompose parent note',
      description: 'Break a classified parent note into 2-5 subtasks with acceptance criteria.',
      kind: 'decompose',
      prompt_id: 'p-vault-grooming-decompose',
      model_stack_id: 'reasoning',
      allowed_executors: ['boris', 'ralph'],
      tool_ids: ['read_vault_note', 'propose_decomposition'],
    },
    {
      id: 'code-pr-from-issue',
      display_name: 'Open PR from GitHub issue',
      description: 'Implement an issue marked `ralph` and open a PR. Tool palette TODO.',
      kind: 'execute',
      prompt_id: 'p-code-pr-from-issue',
      model_stack_id: 'reasoning',
      allowed_executors: ['ralph'],
      tool_ids: [],
      is_active: false,        // not ready until tool palette defined
    },
    {
      id: 'research-structured-investigation',
      display_name: 'Structured research investigation',
      description: 'Multi-step investigation around a question. Tool palette TODO.',
      kind: 'recon',
      prompt_id: 'p-research-structured-investigation',
      model_stack_id: 'reasoning',
      allowed_executors: ['boris'],
      tool_ids: [],
      is_active: false,
    },
    {
      id: 'write-draft-doc',
      display_name: 'Draft a document',
      description: 'Compose a doc draft from a brief. Tool palette TODO.',
      kind: 'execute',
      prompt_id: 'p-write-draft-doc',
      model_stack_id: 'standard',
      allowed_executors: ['ralph'],
      tool_ids: [],
      is_active: false,
    },
  ]);

  // ── verify counts ───────────────────────────────────────────────────────
  const [m] = await db.execute(sql`SELECT COUNT(*)::int AS n FROM models`);
  const [ms] = await db.execute(sql`SELECT COUNT(*)::int AS n FROM model_stacks`);
  const [pp] = await db.execute(sql`SELECT COUNT(*)::int AS n FROM prompts`);
  const [pv] = await db.execute(sql`SELECT COUNT(*)::int AS n FROM prompt_versions`);
  const [tt] = await db.execute(sql`SELECT COUNT(*)::int AS n FROM tools`);
  const [sk] = await db.execute(sql`SELECT COUNT(*)::int AS n FROM skills`);
  console.log('[seed] done:', { models: m.n, model_stacks: ms.n, prompts: pp.n, prompt_versions: pv.n, tools: tt.n, skills: sk.n });
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});
