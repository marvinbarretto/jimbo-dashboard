import { sql } from 'drizzle-orm';
import {
  pgTable, text, integer, real, boolean, timestamp, bigserial,
  index,
} from 'drizzle-orm/pg-core';

// ── email_reports ──────────────────────────────────────────────────────────
//
// Gmail ingestion artefact: one row per processed message. Drives the
// email-triage UI and the localshout forwarding pipeline. Source data is
// raw email; everything beyond gmail_id is derived (extraction, scoring,
// enrichment). Enrichment columns added after initial schema — many older
// rows will be null on those fields, hence no NOT NULLs there.

export const emailReports = pgTable('email_reports', {
  // Synthetic surrogate. AUTOINCREMENT in SQLite → bigserial here. Gmail's
  // own id (gmail_id below) is the natural key, but we keep the integer pk
  // for cheap FKs from forwarded_to_localshout-style references.
  id: bigserial('id', { mode: 'number' }).primaryKey(),

  // Natural key from Gmail. UNIQUE — re-ingesting the same message must
  // upsert, not duplicate.
  gmail_id: text('gmail_id').notNull().unique(),

  // Empty string default (not null) preserves existing semantics: thread_id
  // is *always* populated, but historically with '' for unthreaded messages.
  thread_id: text('thread_id').notNull().default(''),

  // When jimbo finished extracting/analysing — distinct from created_at
  // (when the row was inserted) and from the email's own date.
  processed_at: timestamp('processed_at', { withTimezone: true }).notNull(),

  from_name: text('from_name').notNull().default(''),
  from_email: text('from_email').notNull(),
  subject: text('subject').notNull(),
  body_analysis: text('body_analysis').notNull(),

  // JSON-string in SQLite ('[]' default). Kept as text for now — structure
  // varies per extractor version and we don't query inside it. Promote to
  // jsonb if/when we need to.
  links: text('links').notNull().default('[]'),

  model: text('model').notNull().default(''),
  processing_time_seconds: real('processing_time_seconds').default(0),

  // boolean (was 0/1). decided=true means operator has triaged this report.
  decided: boolean('decided').notNull().default(false),
  decided_at: timestamp('decided_at', { withTimezone: true }),

  // Operator's verdict — free text, low cardinality (keep/discard/forward/...).
  // No CHECK; values still settling.
  decision: text('decision'),

  // 0..100 (or similar) heuristic. Real not int because a future model may
  // emit fractional scores; promotion is free.
  relevance_score: integer('relevance_score'),

  // Where this row originated. Default 'email' for the Gmail path; future
  // sources (telegram, manual paste) will use other values.
  source: text('source').notNull().default('email'),

  // Plain-text body for fulltext search / LLM context. '' default keeps
  // older rows valid before we started storing it.
  body_text: text('body_text').notNull().default(''),

  // Url/identifier of where the message was forwarded (localshout endpoint).
  // Nullable: most reports are not forwarded.
  forwarded_to_localshout: text('forwarded_to_localshout'),

  // ── Enrichment audit (added later — all nullable) ────────────────────────
  // Tracks which prompt/model produced the enrichment so we can replay or
  // diff when prompts evolve.
  enrichment_prompt_id: text('enrichment_prompt_id'),
  enrichment_prompt_version: integer('enrichment_prompt_version'),
  enrichment_model: text('enrichment_model'),
  enrichment_reasoning: text('enrichment_reasoning'),
  enrichment_cost_cents: real('enrichment_cost_cents'),
  enrichment_tokens_input: integer('enrichment_tokens_input'),
  enrichment_tokens_output: integer('enrichment_tokens_output'),
  enriched_at: timestamp('enriched_at', { withTimezone: true }),

  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  decidedIdx: index('idx_email_reports_decided').on(t.decided),
  threadIdx: index('idx_email_reports_thread').on(t.thread_id),
  createdIdx: index('idx_email_reports_created').on(t.created_at),
  relevanceIdx: index('idx_email_reports_relevance').on(t.relevance_score),
  forwardedIdx: index('idx_email_reports_forwarded').on(t.forwarded_to_localshout),
  enrichedAtIdx: index('idx_email_reports_enriched_at').on(t.enriched_at),
}));

export type EmailReport = typeof emailReports.$inferSelect;
export type EmailReportInsert = typeof emailReports.$inferInsert;
