import { sql } from 'drizzle-orm';
import { pgTable, text, boolean, timestamp, primaryKey, index, uniqueIndex, check } from 'drizzle-orm/pg-core';
import { vaultNotes } from './vault.js';
import { actors } from './actors.js';

// ── projects ───────────────────────────────────────────────────────────────
//
// First-class entities. Production keeps these implicit via tag conventions
// ("project:localshout", "project:jimbo") on vault_notes; ETL extracts them
// into proper rows so the kanban can filter and the dashboard can render
// project chips without parsing tags every render.

export const projects = pgTable('projects', {
  // Slug ('localshout', 'jimbo'). Tag namespace stays "project:slug" for
  // backwards compatibility with anything that reads the flat tags.
  id: text('id').primaryKey(),

  display_name: text('display_name').notNull(),

  // Operator-facing notes — free text, no structure. Used in project list
  // hovercards and briefings.
  description: text('description'),

  // active / paused / archived. CHECK below.
  status: text('status').notNull().default('active'),

  // Link to the responsible actor. Production SQLite stores this NOT NULL
  // (every project has an owner) but the dashboard's pre-cutover ETL
  // synthesizes project rows from "project:slug" tags without owner info, so
  // we keep this nullable for now. Promote to NOT NULL post-cutover once real
  // data populates it. FK still enforces referential integrity.
  owner_actor_id: text('owner_actor_id').references(() => actors.id, { onDelete: 'restrict' }),

  // Definition-of-done at the project level — what "this project is finished"
  // means. Free text; surfaced on the project page when present.
  criteria: text('criteria'),

  // Primary repo for the project. Multiple repos can be expressed via
  // criteria/description for now; promote to a join table if it becomes a
  // pattern.
  repo_url: text('repo_url'),

  // Optional CSS variable for the chip tint, paralleling actors.color_token.
  color_token: text('color_token'),

  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  statusCheck: check(
    'projects_status_check',
    sql`${t.status} IN ('active','paused','archived')`,
  ),
}));

// ── vault_item_projects ────────────────────────────────────────────────────
//
// Many-to-many: an item can belong to multiple projects (e.g. cross-project
// research items). Composite PK enforces no-duplicate links.

export const vaultItemProjects = pgTable('vault_item_projects', {
  vault_item_id: text('vault_item_id')
    .notNull()
    .references(() => vaultNotes.id, { onDelete: 'cascade' }),
  project_id: text('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),

  // Items can have multiple projects but only one primary. Enforced by the
  // partial unique index below — the chip on the kanban card uses the primary.
  is_primary: boolean('is_primary').notNull().default(false),

  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.vault_item_id, t.project_id] }),
  projectIdx: index('idx_vault_item_projects_project').on(t.project_id),
  // At most one primary project per item.
  primaryUnique: uniqueIndex('idx_vault_item_projects_one_primary')
    .on(t.vault_item_id)
    .where(sql`${t.is_primary}`),
}));

export type Project = typeof projects.$inferSelect;
export type VaultItemProject = typeof vaultItemProjects.$inferSelect;
