import { sql } from 'drizzle-orm';
import { pgTable, text, boolean, timestamp, index, check } from 'drizzle-orm/pg-core';
import { prompts } from './prompts.js';
import { modelStacks } from './models.js';

// ── skills ─────────────────────────────────────────────────────────────────
//
// First-class capability descriptors. A skill is "what kind of work this
// dispatch is doing" — it ties together a prompt, a model preference,
// the tool palette the model gets, and which actors may run it.
//
// Improvements vs legacy schema:
//  - `kind` — coarse classification for UI grouping + queue routing
//  - `allowed_executors` — actor allowlist; gate enforced at dispatch
//    creation alongside the ready-gate (Phase C #2)
//  - `tool_ids text[]` — replaces the skills_tools join table; trades
//    referential integrity for read simplicity. Validated at app layer.

export const skills = pgTable('skills', {
  id: text('id').primaryKey(),                                  // flat slug — 'vault-grooming-analyse'
  display_name: text('display_name').notNull(),
  description: text('description'),
  kind: text('kind').notNull(),                                 // 'groom' | 'classify' | 'decompose' | 'execute' | 'recon'

  prompt_id: text('prompt_id').references(() => prompts.id, { onDelete: 'set null' }),
  model_stack_id: text('model_stack_id').references(() => modelStacks.id, { onDelete: 'set null' }),

  // Soft FK — actor ids are managed in actors table; we don't enforce
  // each element here because Postgres can't do per-element FK on arrays.
  allowed_executors: text('allowed_executors').array().notNull().default(sql`'{}'::text[]`),
  // Soft FK to tools.id for the same reason.
  tool_ids: text('tool_ids').array().notNull().default(sql`'{}'::text[]`),

  is_active: boolean('is_active').notNull().default(true),
  notes: text('notes'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  activeIdx: index('idx_skills_active').on(t.is_active),
  kindIdx: index('idx_skills_kind').on(t.kind),
  promptIdx: index('idx_skills_prompt').on(t.prompt_id),
  stackIdx: index('idx_skills_model_stack').on(t.model_stack_id),
  kindCheck: check('skills_kind_check', sql`${t.kind} IN ('groom','classify','decompose','execute','recon')`),
}));

export type Skill = typeof skills.$inferSelect;
