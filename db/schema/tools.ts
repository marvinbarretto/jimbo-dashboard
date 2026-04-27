import { sql } from 'drizzle-orm';
import { pgTable, text, boolean, timestamp, jsonb, index, check } from 'drizzle-orm/pg-core';

// ── tools ──────────────────────────────────────────────────────────────────
//
// Capabilities the runner exposes to a model. One row = one tool the
// agent can call. Schema = Anthropic-compatible tool input definition.
//
// Improvement vs legacy: dropped tool_versions. Tools are code (HTTP
// endpoints or in-process handlers). Behaviour evolves through PRs and
// is observable via git history; bumping a versioned-row column on every
// schema change adds bookkeeping without giving us anything we can't
// already get from `git log`.

export const tools = pgTable('tools', {
  id: text('id').primaryKey(),                                  // slug — 'read_vault_note'
  display_name: text('display_name').notNull(),
  description: text('description').notNull(),                    // shown to the model
  handler_type: text('handler_type').notNull().default('http'),  // 'http' | 'internal'
  endpoint_url: text('endpoint_url'),                            // populated for handler_type='http'
  input_schema: jsonb('input_schema').notNull(),                 // Anthropic tool.input_schema
  output_schema: jsonb('output_schema'),                         // optional return shape (documentation)
  is_active: boolean('is_active').notNull().default(true),
  notes: text('notes'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  activeIdx: index('idx_tools_active').on(t.is_active),
  handlerCheck: check('tools_handler_type_check', sql`${t.handler_type} IN ('http','internal')`),
}));

export type Tool = typeof tools.$inferSelect;
