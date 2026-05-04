import {
  pgTable, text, timestamp, jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// email_reports — short-lived working table for the email triage pipeline.
//
// Gmail is the source of truth for content; the vault is the long-term store
// for anything important. Rows here exist only to drive in-flight processing
// stages and TTL out after 90 days. Pipeline progresses by setting stage
// timestamps; the next job picks up rows where its stage is still null.

export const emailReports = pgTable('email_reports', {
  // Natural key from Gmail. Primary key — no surrogate id needed.
  gmail_id: text('gmail_id').primaryKey(),

  thread_id: text('thread_id'),
  from_name: text('from_name'),
  from_email: text('from_email').notNull(),
  subject: text('subject'),

  // Plain-text body. Null until job 2 (detail-fetch) populates it.
  body_text: text('body_text'),

  // Gmail labels at discovery time (e.g. ['INBOX','UNREAD','CATEGORY_UPDATES']).
  // Cheap signal for rules-based gating without needing the body.
  label_ids: jsonb('label_ids'),

  // ── Pipeline stage timestamps ──────────────────────────────────────
  // Each timestamp doubles as audit log and queue marker. Null = not done.
  discovered_at:   timestamp('discovered_at',   { withTimezone: true }).notNull().defaultNow(),
  body_fetched_at: timestamp('body_fetched_at', { withTimezone: true }),
  gated_at:        timestamp('gated_at',        { withTimezone: true }),

  // ── Verdict (set when gated_at is set) ─────────────────────────────
  verdict:         text('verdict'),         // 'keep' | 'toss' | null (until gated)
  verdict_reason:  text('verdict_reason'),  // one-line model justification
  verdict_model:   text('verdict_model'),   // which model decided

  // ── Promotion to vault ─────────────────────────────────────────────
  // Set when an email graduates into a permanent vault note. Outlives the
  // 90-day TTL on this row only via the foreign key on vault_notes —
  // this column is just a back-reference for inspection.
  vault_note_id:   text('vault_note_id'),

  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  // Queue indexes — partial, so they only cover rows still needing work.
  needsFetchIdx: index('idx_email_reports_needs_fetch')
    .on(t.discovered_at).where(sql`body_fetched_at IS NULL`),
  needsGateIdx: index('idx_email_reports_needs_gate')
    .on(t.body_fetched_at).where(sql`gated_at IS NULL AND body_fetched_at IS NOT NULL`),

  // General indexes
  createdIdx: index('idx_email_reports_created').on(t.created_at),
  verdictIdx: index('idx_email_reports_verdict').on(t.verdict),
}));

export type EmailReport = typeof emailReports.$inferSelect;
export type EmailReportInsert = typeof emailReports.$inferInsert;
