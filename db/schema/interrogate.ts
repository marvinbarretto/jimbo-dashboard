import { sql } from 'drizzle-orm';
import {
  pgTable, text, integer, real, jsonb, bigint, timestamp,
  index, uniqueIndex, check,
} from 'drizzle-orm/pg-core';

// ── interrogate_* ─────────────────────────────────────────────────────────
//
// Postgres-native rewrite of the /interrogate skill's twelve SQLite tables.
// Greenfield port — production data (16 rows total) is being dropped, so
// shape decisions are deliberate, not bound by a back-compat snapshot.
//
// Subsystem shape:
//   sessions ──< answers              (workflow capture)
//            ──< proposals            (AI-suggested entity edits, await operator)
//   evidence  →  any entity           (polymorphic, no FK on entity_id)
//   values  ←  priorities             (serves_value_id, SET NULL)
//   priorities ←  goals               (priority_id, SET NULL)
//   experiments / tensions reference any entity polymorphically (no FK)
//
// Eight "entity" tables share a near-identical shape (id/content/confidence/
// status/source/timestamps). Resisting the urge to extract a shared partial:
// Drizzle's table builder doesn't compose cleanly, and explicit beats clever
// when each entity may grow its own lifecycle. CHECK constraints on `status`
// are duplicated per table for the same reason — operator may want different
// states for different entities later, merging now is premature.

// ── interrogate_values ────────────────────────────────────────────────────

export const interrogateValues = pgTable('interrogate_values', {
  id: text('id').primaryKey(),
  content: text('content').notNull(),

  // Free-text rank — operator-assigned ordering, sparse and editable. Not a
  // unique constraint; ties are tolerated and surfaced for re-ranking.
  rank: integer('rank'),

  // 0..1 model/operator confidence. real, not numeric — display, not money.
  confidence: real('confidence').notNull().default(0.5),

  // CHECK-constrained lifecycle. 'superseded' is distinct from 'archived':
  // superseded means a newer value replaced this one (audit trail); archived
  // means deliberately retired.
  status: text('status').notNull().default('active'),

  // Free-text discriminator (self/coach/import/…). Cardinality is low but
  // values aren't yet stable — no CHECK until the set settles.
  source: text('source').notNull().default('self'),

  last_reviewed_at: timestamp('last_reviewed_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  statusIdx: index('idx_interrogate_values_status').on(t.status),
  statusCheck: check(
    'interrogate_values_status_check',
    sql`${t.status} IN ('active','archived','superseded')`,
  ),
}));

// ── interrogate_interests ─────────────────────────────────────────────────

export const interrogateInterests = pgTable('interrogate_interests', {
  id: text('id').primaryKey(),
  content: text('content').notNull(),

  // CHECK-constrained — coarse three-bucket dial. Could grow to numeric
  // 0..1 later; bucket-first matches how operators reason about interest.
  intensity: text('intensity').notNull().default('medium'),

  confidence: real('confidence').notNull().default(0.5),
  status: text('status').notNull().default('active'),
  source: text('source').notNull().default('self'),

  // Distinct from last_reviewed_at: engaged = "I did something with this",
  // reviewed = "I looked at this entry to confirm it still fits".
  last_engaged_at: timestamp('last_engaged_at', { withTimezone: true }),
  last_reviewed_at: timestamp('last_reviewed_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  statusIdx: index('idx_interrogate_interests_status').on(t.status),
  intensityCheck: check(
    'interrogate_interests_intensity_check',
    sql`${t.intensity} IN ('low','medium','high')`,
  ),
  statusCheck: check(
    'interrogate_interests_status_check',
    sql`${t.status} IN ('active','archived','superseded')`,
  ),
}));

// ── interrogate_sessions ──────────────────────────────────────────────────
//
// One row per /interrogate run. answers/proposals reference this with
// ON DELETE CASCADE — wiping a session takes its workflow rows with it.

export const interrogateSessions = pgTable('interrogate_sessions', {
  id: text('id').primaryKey(),

  // Free-text mode for now. The /interrogate skill has a fixed registry
  // (src/services/interrogate-modes.ts in jimbo-api) but it's not readable
  // from here; tighten to a CHECK once the canonical list is mirrored.
  // TODO: lift mode list from interrogate-modes.ts and add a CHECK.
  mode: text('mode').notNull(),

  // CHECK-constrained — two-state energy switch. Affects session pacing in
  // the skill (light = 3-5 min, deep = 15+).
  energy: text('energy').notNull().default('light'),

  started_at: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  ended_at: timestamp('ended_at', { withTimezone: true }),

  // Filesystem pointers carried verbatim from SQLite. Files live outside
  // the DB; columns are diagnostic only — not validated, not FK'd.
  transcript_path: text('transcript_path'),
  raw_log_path: text('raw_log_path'),

  // Inline transcript copy — convenience for in-DB search without touching
  // the filesystem. Nullable: not every session persists one.
  transcript_text: text('transcript_text'),
}, (t) => ({
  startedIdx: index('idx_interrogate_sessions_started').on(t.started_at.desc()),
  energyCheck: check(
    'interrogate_sessions_energy_check',
    sql`${t.energy} IN ('light','deep')`,
  ),
}));

// ── interrogate_answers ───────────────────────────────────────────────────
//
// Captures the prompt/answer pairs of a session in order. ordinal is per-
// session monotonic; UNIQUE(session_id, ordinal) prevents duplicate slots
// from a buggy resume path.

export const interrogateAnswers = pgTable('interrogate_answers', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  session_id: text('session_id')
    .notNull()
    .references(() => interrogateSessions.id, { onDelete: 'cascade' }),

  // Per-session order. integer (not bigint) — sessions are short.
  ordinal: integer('ordinal').notNull(),

  prompt_text: text('prompt_text').notNull(),
  answer_text: text('answer_text').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  sessionIdx: index('idx_interrogate_answers_session').on(t.session_id, t.ordinal),
  // Unique slot per session — guards against a resume writing ordinal 3 twice.
  sessionOrdinalUq: uniqueIndex('uq_interrogate_answers_session_ordinal')
    .on(t.session_id, t.ordinal),
}));

// ── interrogate_priorities ────────────────────────────────────────────────

export const interrogatePriorities = pgTable('interrogate_priorities', {
  id: text('id').primaryKey(),
  content: text('content').notNull(),
  rank: integer('rank'),

  // SET NULL — a priority outlives the value it served. Removing a value
  // shouldn't erase the priority; the disconnect is the signal.
  serves_value_id: text('serves_value_id')
    .references(() => interrogateValues.id, { onDelete: 'set null' }),

  // Free-text — operators write 'this quarter', 'next 6 months', etc.
  // No CHECK: vocabulary is human, not enumerable.
  timeframe: text('timeframe'),

  // Operator's verdict on the priority (kept/dropped/changed/…). Free text
  // pending a stable vocabulary.
  verdict: text('verdict'),

  confidence: real('confidence').notNull().default(0.5),
  status: text('status').notNull().default('active'),
  source: text('source').notNull().default('self'),

  last_reviewed_at: timestamp('last_reviewed_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  statusIdx: index('idx_interrogate_priorities_status').on(t.status),
  servesIdx: index('idx_interrogate_priorities_serves').on(t.serves_value_id),
  statusCheck: check(
    'interrogate_priorities_status_check',
    sql`${t.status} IN ('active','archived','superseded')`,
  ),
}));

// ── interrogate_goals ─────────────────────────────────────────────────────

export const interrogateGoals = pgTable('interrogate_goals', {
  id: text('id').primaryKey(),
  content: text('content').notNull(),

  // SET NULL — same rationale as priorities.serves_value_id.
  priority_id: text('priority_id')
    .references(() => interrogatePriorities.id, { onDelete: 'set null' }),

  success_criteria: text('success_criteria'),

  // Free-text deadline — operators write '2026 Q2', 'before launch', etc.
  // Promote to timestamptz once date strings dominate; not yet.
  deadline: text('deadline'),

  // Distinct from `status` (lifecycle): goal_status is outcome — was the
  // goal hit, missed, or abandoned? Both states needed: an archived goal
  // can still be a 'hit' historically.
  goal_status: text('goal_status').notNull().default('active'),

  confidence: real('confidence').notNull().default(0.5),
  status: text('status').notNull().default('active'),
  source: text('source').notNull().default('self'),

  last_reviewed_at: timestamp('last_reviewed_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  statusIdx: index('idx_interrogate_goals_status').on(t.status),
  priorityIdx: index('idx_interrogate_goals_priority').on(t.priority_id),
  goalStatusIdx: index('idx_interrogate_goals_goal_status').on(t.goal_status),
  goalStatusCheck: check(
    'interrogate_goals_goal_status_check',
    sql`${t.goal_status} IN ('active','hit','missed','abandoned')`,
  ),
  statusCheck: check(
    'interrogate_goals_status_check',
    sql`${t.status} IN ('active','archived','superseded')`,
  ),
}));

// ── interrogate_experiments ───────────────────────────────────────────────
//
// Time-bounded "let's try X" hypotheses with a review_at checkpoint.
// spawned_from_(type|id) is polymorphic — no FK on the id, CHECK on type
// only, since the target table is variable.

export const interrogateExperiments = pgTable('interrogate_experiments', {
  id: text('id').primaryKey(),
  hypothesis: text('hypothesis').notNull(),

  window_start: timestamp('window_start', { withTimezone: true }),
  window_end: timestamp('window_end', { withTimezone: true }),
  review_at: timestamp('review_at', { withTimezone: true }),

  // Verdict written at review_at. Free text — operator's prose evaluation.
  verdict: text('verdict'),

  // Polymorphic origin pointer. Type is constrained; id is not FK'd because
  // the target table varies. Discipline-by-CHECK, not RI.
  spawned_from_type: text('spawned_from_type'),
  spawned_from_id: text('spawned_from_id'),

  confidence: real('confidence').notNull().default(0.5),
  status: text('status').notNull().default('active'),
  source: text('source').notNull().default('self'),

  last_reviewed_at: timestamp('last_reviewed_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  statusIdx: index('idx_interrogate_experiments_status').on(t.status),
  reviewIdx: index('idx_interrogate_experiments_review').on(t.review_at),
  spawnedFromTypeCheck: check(
    'interrogate_experiments_spawned_from_type_check',
    sql`${t.spawned_from_type} IS NULL OR ${t.spawned_from_type} IN ('value','interest','priority','goal','tension','open_question')`,
  ),
  statusCheck: check(
    'interrogate_experiments_status_check',
    sql`${t.status} IN ('active','archived','superseded')`,
  ),
}));

// ── interrogate_nogos ─────────────────────────────────────────────────────

export const interrogateNogos = pgTable('interrogate_nogos', {
  id: text('id').primaryKey(),
  content: text('content').notNull(),

  // Why this is a no-go. Optional — sometimes the content is self-evident.
  reason: text('reason'),

  // Distinct from created_at: declared_at is when the no-go became binding
  // (operator commits to it); created_at is when the row landed. Usually
  // equal but the skill may stage drafts before declaration.
  declared_at: timestamp('declared_at', { withTimezone: true }).notNull().defaultNow(),

  confidence: real('confidence').notNull().default(0.5),
  status: text('status').notNull().default('active'),
  source: text('source').notNull().default('self'),

  last_reviewed_at: timestamp('last_reviewed_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  statusIdx: index('idx_interrogate_nogos_status').on(t.status),
  statusCheck: check(
    'interrogate_nogos_status_check',
    sql`${t.status} IN ('active','archived','superseded')`,
  ),
}));

// ── interrogate_tensions ──────────────────────────────────────────────────
//
// A felt conflict between two entities (value vs goal, interest vs nogo,
// …). Both endpoints polymorphic; CHECK on type, no FK on id.

export const interrogateTensions = pgTable('interrogate_tensions', {
  id: text('id').primaryKey(),
  content: text('content').notNull(),

  // How the operator is (or plans to be) resolving the tension. Free text —
  // narrative, not enumerable.
  resolving_how: text('resolving_how'),

  between_a_type: text('between_a_type'),
  between_a_id: text('between_a_id'),
  between_b_type: text('between_b_type'),
  between_b_id: text('between_b_id'),

  confidence: real('confidence').notNull().default(0.5),
  status: text('status').notNull().default('active'),
  source: text('source').notNull().default('self'),

  last_reviewed_at: timestamp('last_reviewed_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  statusIdx: index('idx_interrogate_tensions_status').on(t.status),
  betweenATypeCheck: check(
    'interrogate_tensions_between_a_type_check',
    sql`${t.between_a_type} IS NULL OR ${t.between_a_type} IN ('value','interest','priority','goal','nogo','open_question')`,
  ),
  betweenBTypeCheck: check(
    'interrogate_tensions_between_b_type_check',
    sql`${t.between_b_type} IS NULL OR ${t.between_b_type} IN ('value','interest','priority','goal','nogo','open_question')`,
  ),
  statusCheck: check(
    'interrogate_tensions_status_check',
    sql`${t.status} IN ('active','archived','superseded')`,
  ),
}));

// ── interrogate_open_questions ────────────────────────────────────────────

export const interrogateOpenQuestions = pgTable('interrogate_open_questions', {
  id: text('id').primaryKey(),
  content: text('content').notNull(),

  raised_at: timestamp('raised_at', { withTimezone: true }).notNull().defaultNow(),
  resolved_at: timestamp('resolved_at', { withTimezone: true }),

  // The answer/conclusion. Free text — could be a sentence or paragraph.
  resolution: text('resolution'),

  confidence: real('confidence').notNull().default(0.5),
  status: text('status').notNull().default('active'),
  source: text('source').notNull().default('self'),

  last_reviewed_at: timestamp('last_reviewed_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  statusIdx: index('idx_interrogate_open_questions_status').on(t.status),
  statusCheck: check(
    'interrogate_open_questions_status_check',
    sql`${t.status} IN ('active','archived','superseded')`,
  ),
}));

// ── interrogate_evidence ──────────────────────────────────────────────────
//
// Polymorphic evidence rows — supports/contradicts an entity. entity_id
// deliberately not FK'd (target table varies); type is CHECK-constrained.
// source_kind / source_id is a second polymorphic pointer (where the
// evidence came from); same shape, same rationale.

export const interrogateEvidence = pgTable('interrogate_evidence', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),

  entity_type: text('entity_type').notNull(),
  entity_id: text('entity_id').notNull(),

  source_kind: text('source_kind').notNull(),
  source_id: text('source_id'),

  stance: text('stance').notNull(),

  // Weight of the evidence (0..∞ but typically 0..1). real, display-only.
  // CHECK weight >= 0 keeps it sane.
  weight: real('weight').notNull().default(1.0),

  // Optional excerpt — the snippet of journal/answer/etc that triggered this.
  snippet: text('snippet'),

  discovered_at: timestamp('discovered_at', { withTimezone: true }).notNull().defaultNow(),

  // SET NULL — evidence outlives the session that surfaced it. The session
  // is the discovery context, not the source of truth.
  discovered_via_session_id: text('discovered_via_session_id')
    .references(() => interrogateSessions.id, { onDelete: 'set null' }),
}, (t) => ({
  entityIdx: index('idx_interrogate_evidence_entity').on(t.entity_type, t.entity_id),
  sourceIdx: index('idx_interrogate_evidence_source').on(t.source_kind, t.source_id),
  sessionIdx: index('idx_interrogate_evidence_session').on(t.discovered_via_session_id),

  entityTypeCheck: check(
    'interrogate_evidence_entity_type_check',
    sql`${t.entity_type} IN ('value','interest','priority','goal','experiment','nogo','tension','open_question')`,
  ),
  sourceKindCheck: check(
    'interrogate_evidence_source_kind_check',
    sql`${t.source_kind} IN ('journal','vault','task','calendar','answer','manual')`,
  ),
  stanceCheck: check(
    'interrogate_evidence_stance_check',
    sql`${t.stance} IN ('supports','contradicts')`,
  ),
  weightCheck: check(
    'interrogate_evidence_weight_check',
    sql`${t.weight} >= 0`,
  ),
}));

// ── interrogate_proposals ─────────────────────────────────────────────────
//
// AI-suggested edits on entities, awaiting operator decision. payload is
// jsonb (was TEXT-JSON in SQLite) — queryable, indexable, validated. CASCADE
// on session deletion mirrors answers: dropping a session drops its
// workflow byproducts.

export const interrogateProposals = pgTable('interrogate_proposals', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  session_id: text('session_id')
    .notNull()
    .references(() => interrogateSessions.id, { onDelete: 'cascade' }),

  entity_type: text('entity_type').notNull(),
  // Null when action='create' — the entity doesn't exist yet.
  entity_id: text('entity_id'),

  action: text('action').notNull(),

  // Action payload — shape depends on action. jsonb (not text) so we can
  // probe operator-side without parsing in app code.
  payload: jsonb('payload').notNull(),

  confidence: real('confidence').notNull(),
  rationale: text('rationale'),

  // 'edited' is distinct from 'accepted': operator accepted with changes,
  // and we want to know that for audit.
  status: text('status').notNull().default('pending'),
  decided_at: timestamp('decided_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  sessionIdx: index('idx_interrogate_proposals_session').on(t.session_id),
  statusIdx: index('idx_interrogate_proposals_status').on(t.status),

  entityTypeCheck: check(
    'interrogate_proposals_entity_type_check',
    sql`${t.entity_type} IN ('value','interest','priority','goal','experiment','nogo','tension','open_question')`,
  ),
  actionCheck: check(
    'interrogate_proposals_action_check',
    sql`${t.action} IN ('create','update','archive','adjust_confidence')`,
  ),
  statusCheck: check(
    'interrogate_proposals_status_check',
    sql`${t.status} IN ('pending','accepted','rejected','edited')`,
  ),
}));

// ── Type aliases ──────────────────────────────────────────────────────────

export type InterrogateValue = typeof interrogateValues.$inferSelect;
export type InterrogateValueInsert = typeof interrogateValues.$inferInsert;
export type InterrogateInterest = typeof interrogateInterests.$inferSelect;
export type InterrogateInterestInsert = typeof interrogateInterests.$inferInsert;
export type InterrogateSession = typeof interrogateSessions.$inferSelect;
export type InterrogateSessionInsert = typeof interrogateSessions.$inferInsert;
export type InterrogateAnswer = typeof interrogateAnswers.$inferSelect;
export type InterrogateAnswerInsert = typeof interrogateAnswers.$inferInsert;
export type InterrogatePriority = typeof interrogatePriorities.$inferSelect;
export type InterrogatePriorityInsert = typeof interrogatePriorities.$inferInsert;
export type InterrogateGoal = typeof interrogateGoals.$inferSelect;
export type InterrogateGoalInsert = typeof interrogateGoals.$inferInsert;
export type InterrogateExperiment = typeof interrogateExperiments.$inferSelect;
export type InterrogateExperimentInsert = typeof interrogateExperiments.$inferInsert;
export type InterrogateNogo = typeof interrogateNogos.$inferSelect;
export type InterrogateNogoInsert = typeof interrogateNogos.$inferInsert;
export type InterrogateTension = typeof interrogateTensions.$inferSelect;
export type InterrogateTensionInsert = typeof interrogateTensions.$inferInsert;
export type InterrogateOpenQuestion = typeof interrogateOpenQuestions.$inferSelect;
export type InterrogateOpenQuestionInsert = typeof interrogateOpenQuestions.$inferInsert;
export type InterrogateEvidence = typeof interrogateEvidence.$inferSelect;
export type InterrogateEvidenceInsert = typeof interrogateEvidence.$inferInsert;
export type InterrogateProposal = typeof interrogateProposals.$inferSelect;
export type InterrogateProposalInsert = typeof interrogateProposals.$inferInsert;
