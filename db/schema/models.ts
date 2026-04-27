import { sql } from 'drizzle-orm';
import { pgTable, text, boolean, timestamp, index, check, numeric } from 'drizzle-orm/pg-core';

// ── models ─────────────────────────────────────────────────────────────────
//
// Identifies a concrete LLM model (provider + model id). Soft-referenced
// from costs.model and from model_stacks.model_ids[].
//
// Pricing is NOT stored here — `services/pricing.ts` in jimbo-api is the
// canonical pricing source. Promoting to DB-driven prices is a separate
// decision (would need a migration step on every Anthropic price change).

export const models = pgTable('models', {
  id: text('id').primaryKey(),                                  // 'claude-sonnet-4-6'
  display_name: text('display_name').notNull(),
  provider: text('provider').notNull(),                          // 'anthropic' | 'google' | 'openai'
  is_active: boolean('is_active').notNull().default(true),
  notes: text('notes'),

  // ── Pricing (USD per million tokens) ─────────────────────────────────
  // jimbo-api/src/services/pricing.ts read these to compute cost on each
  // turn. NULL means "no rate known" — record the call with cost=0 rather
  // than refuse to log it. Updates happen here, not in code; rate changes
  // ship as INSERT/UPDATE on this table.
  input_price_per_million: numeric('input_price_per_million', { precision: 10, scale: 6 }),
  output_price_per_million: numeric('output_price_per_million', { precision: 10, scale: 6 }),
  cache_read_price_per_million: numeric('cache_read_price_per_million', { precision: 10, scale: 6 }),
  cache_write_price_per_million: numeric('cache_write_price_per_million', { precision: 10, scale: 6 }),

  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  activeIdx: index('idx_models_active').on(t.is_active),
  providerIdx: index('idx_models_provider').on(t.provider),
  providerCheck: check('models_provider_check', sql`${t.provider} IN ('anthropic','google','openai','deepseek','openrouter')`),
}));

// ── model_stacks ───────────────────────────────────────────────────────────
//
// A named ordered list of models. Skills point at a stack (model_stack_id)
// to declare model preference. The runner picks the first available model
// from the stack at dispatch time. `fast_model_id` is the cheap fallback
// for low-stakes calls (e.g. classification confidence triage).

export const modelStacks = pgTable('model_stacks', {
  id: text('id').primaryKey(),                                  // 'standard' | 'fast' | 'reasoning' etc
  display_name: text('display_name').notNull(),
  description: text('description'),
  model_ids: text('model_ids').array().notNull().default(sql`'{}'::text[]`),
  fast_model_id: text('fast_model_id').references(() => models.id, { onDelete: 'set null' }),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  activeIdx: index('idx_model_stacks_active').on(t.is_active),
}));

export type Model = typeof models.$inferSelect;
export type ModelStack = typeof modelStacks.$inferSelect;
