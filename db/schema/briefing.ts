import {
  pgTable, text, integer, timestamp, bigserial,
  index,
} from 'drizzle-orm/pg-core';

// ── briefing_analyses ──────────────────────────────────────────────────────
//
// Per-session AI briefing artefacts. The morning/afternoon pipeline emits
// one row containing the full analysis text plus model attribution. Operator
// rates them post-hoc; ratings feed prompt-iteration decisions.

export const briefingAnalyses = pgTable('briefing_analyses', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),

  // Free-text session label (e.g. 'morning-2026-04-25'). Not a FK — sessions
  // aren't first-class entities, just a grouping handle.
  session: text('session').notNull(),

  model: text('model').notNull(),

  // When the model produced the analysis (distinct from created_at, which
  // is the row-insert time).
  generated_at: timestamp('generated_at', { withTimezone: true }).notNull(),

  // Full markdown/text output. Not jsonb — it's prose, not structured.
  analysis: text('analysis').notNull(),

  // Operator rating, often null until rated. No CHECK — scale still TBD
  // (currently 1..5 in practice but promotable).
  user_rating: integer('user_rating'),

  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  createdIdx: index('idx_briefing_analyses_created').on(t.created_at),
  sessionIdx: index('idx_briefing_analyses_session').on(t.session),
}));

export type BriefingAnalysis = typeof briefingAnalyses.$inferSelect;
export type BriefingAnalysisInsert = typeof briefingAnalyses.$inferInsert;
