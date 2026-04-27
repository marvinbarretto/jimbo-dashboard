import { pgTable, text, integer, boolean, timestamp, uuid, index, uniqueIndex, jsonb } from 'drizzle-orm/pg-core';

// ── prompts ────────────────────────────────────────────────────────────────
//
// Versioned content. A prompt has stable identity (id) and many versions.
// `current_version_id` is the live pointer; iterating means inserting a new
// prompt_versions row + flipping current_version_id.
//
// Skills reference prompts (not prompt_versions) — they get whichever
// version is current. Cost rows pin the resolved prompt_version_id at
// dispatch time so historical cost-by-version queries still work after
// the pointer moves.

export const prompts = pgTable('prompts', {
  id: text('id').primaryKey(),                                  // slug — 'vault-grooming-analyse'
  display_name: text('display_name').notNull(),
  description: text('description'),
  current_version_id: uuid('current_version_id'),               // FK to prompt_versions; nullable until first version exists
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  activeIdx: index('idx_prompts_active').on(t.is_active),
}));

// ── prompt_versions ────────────────────────────────────────────────────────
//
// Append-only history. Every prompt iteration = new row. `version` is
// auto-assigned (1, 2, 3, …) per prompt_id by a trigger added in the
// migration's pre/post hooks. `parent_version_id` captures genealogy
// (allows branching iterations).
//
// `system_content` is the system prompt; `user_content` is an optional
// body template (substitution happens in the runner).

export const promptVersions = pgTable('prompt_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  prompt_id: text('prompt_id').notNull().references(() => prompts.id, { onDelete: 'cascade' }),
  version: integer('version').notNull(),
  system_content: text('system_content').notNull(),
  user_content: text('user_content'),
  input_schema: jsonb('input_schema'),
  output_schema: jsonb('output_schema'),
  notes: text('notes'),
  parent_version_id: uuid('parent_version_id'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  promptIdx: index('idx_prompt_versions_prompt').on(t.prompt_id),
  promptVersionUnique: uniqueIndex('uq_prompt_versions_prompt_version').on(t.prompt_id, t.version),
}));

export type Prompt = typeof prompts.$inferSelect;
export type PromptVersion = typeof promptVersions.$inferSelect;
