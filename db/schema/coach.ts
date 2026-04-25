import { sql } from 'drizzle-orm';
import {
  pgTable, text, integer, boolean, timestamp, real,
  index, check,
} from 'drizzle-orm/pg-core';

// ── coach_supplements ─────────────────────────────────────────────────────
//
// Postgres-native rewrite of the production SQLite coach_supplements table.
// The supplements catalogue: what Marvin takes, dosing, scheduling rationale,
// and loading-phase tracking. CHECK on `type` lifted verbatim from snapshot —
// adding a new supplement type forces an explicit migration, which is what we
// want while the catalogue is small and curated.

export const coachSupplements = pgTable('coach_supplements', {
  // Slug-style PK preserves cross-references from nudges/logs and any external
  // links. Stable identity outlives renames.
  id: text('id').primaryKey(),

  name: text('name').notNull(),

  // CHECK-constrained: 4 known categories. Nullable in production (some legacy
  // rows lack a type). New categories should be deliberate, not silently typed.
  type: text('type'),

  dose_amount: real('dose_amount').notNull(),
  dose_unit: text('dose_unit').notNull(),

  // jsonb in production is stored as TEXT '{}' default; we keep raw JSON-string
  // semantics as text to avoid premature schema commitments on the conditions
  // shape (varies by supplement: time-of-day, with-food, paired-with, etc.).
  conditions: text('conditions').notNull().default('{}'),

  // text[] — production stores JSON-string '[]'; we read with json_each into a
  // native array. Empty array (not null) so consumers can always iterate.
  timing_tags: text('timing_tags').array().notNull().default(sql`'{}'::text[]`),

  rationale_short: text('rationale_short').notNull(),
  rationale_long: text('rationale_long').notNull(),

  // boolean (was 0/1 int). Defaults true — new supplements are active on
  // creation; deactivation is the explicit operator action.
  active: boolean('active').notNull().default(true),

  remaining_amount: real('remaining_amount'),

  // ── Loading phase (optional) ─────────────────────────────────────────────
  // Creatine and similar supplements have a higher initial dose for N days.
  // Three nullable columns rather than a separate table — tied 1:1 to the
  // supplement and only meaningful together.
  loading_started_at: timestamp('loading_started_at', { withTimezone: true }),
  loading_daily_dose: real('loading_daily_dose'),
  loading_duration_days: integer('loading_duration_days'),

  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  typeCheck: check(
    'coach_supplements_type_check',
    sql`${t.type} IN ('protein','creatine','vitamin','other')`,
  ),
}));

// ── coach_nudges ──────────────────────────────────────────────────────────
//
// Scheduled prompts to take supplements. Identified by `nudge_key` (stable
// idempotency key derived from anchor + scheduled_for) so re-running the
// scheduler doesn't double-nudge. State machine drives delivery + outcome.

export const coachNudges = pgTable('coach_nudges', {
  // bigserial-style — production uses INTEGER AUTOINCREMENT; integer with
  // generatedAlwaysAsIdentity gives the same semantics in Postgres.
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),

  // Idempotency anchor. UNIQUE so re-scheduling the same anchor+window is a
  // no-op upsert rather than a duplicate.
  nudge_key: text('nudge_key').notNull().unique(),

  // anchor = semantic time-window label (morning/post-workout/etc). Free text
  // — anchors evolve with the routine.
  anchor: text('anchor').notNull(),

  // JSON-string list of supplement IDs to take at this nudge. Kept as text
  // (not text[]) because production writes JSON; conversion to array can come
  // later once consumers are ready.
  supplements: text('supplements').notNull(),

  scheduled_for: timestamp('scheduled_for', { withTimezone: true }).notNull(),
  pushed_at: timestamp('pushed_at', { withTimezone: true }),

  // Free text — values like 'telegram', 'web_push'. Low cardinality but the
  // delivery channels list is operational, not schema-worthy yet.
  delivered_via: text('delivered_via'),

  // CHECK: 4 lifecycle states. 'expired' distinguishes "operator never acted
  // and the window passed" from 'skipped' (explicit dismiss).
  state: text('state').notNull().default('pending'),

  action_at: timestamp('action_at', { withTimezone: true }),

  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  // Mirrors the SQLite index — drives the "what's due now?" query.
  stateScheduledIdx: index('idx_coach_nudges_state_scheduled').on(t.state, t.scheduled_for),

  stateCheck: check(
    'coach_nudges_state_check',
    sql`${t.state} IN ('pending','logged','skipped','expired')`,
  ),
}));

// ── coach_logs ────────────────────────────────────────────────────────────
//
// Append-only ledger of supplement intake. Linked back to the nudge that
// prompted it (when applicable) so we can measure adherence per nudge.

export const coachLogs = pgTable('coach_logs', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),

  // FK to supplements. CASCADE delete — if a supplement is removed from the
  // catalogue entirely, its history goes with it (matches production semantics).
  supplement_id: text('supplement_id')
    .notNull()
    .references(() => coachSupplements.id, { onDelete: 'cascade' }),

  taken_at: timestamp('taken_at', { withTimezone: true }).notNull().defaultNow(),

  dosage: real('dosage').notNull(),

  // CHECK: 3 ingestion paths. Distinguishing in_app vs telegram_deeplink lets
  // us measure which channel actually drives action.
  source: text('source').notNull(),

  // FK to the prompting nudge. SET NULL on delete — nudge cleanup shouldn't
  // erase the intake history; the log stands on its own.
  nudge_id: integer('nudge_id').references(() => coachNudges.id, { onDelete: 'set null' }),

  notes: text('notes'),
}, (t) => ({
  // Mirrors the SQLite index — drives per-supplement timeline queries.
  supplementTimeIdx: index('idx_coach_logs_supplement_time').on(t.supplement_id, t.taken_at),

  sourceCheck: check(
    'coach_logs_source_check',
    sql`${t.source} IN ('in_app','telegram_deeplink','manual')`,
  ),
}));

export type CoachSupplement = typeof coachSupplements.$inferSelect;
export type CoachSupplementInsert = typeof coachSupplements.$inferInsert;

export type CoachNudge = typeof coachNudges.$inferSelect;
export type CoachNudgeInsert = typeof coachNudges.$inferInsert;

export type CoachLog = typeof coachLogs.$inferSelect;
export type CoachLogInsert = typeof coachLogs.$inferInsert;
