import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

// ── settings ───────────────────────────────────────────────────────────────
//
// System-wide key/value store. 39 rows in production. Lives separately from
// per-user state because most settings are operational (cron schedules,
// feature flags, default models). Value is text — callers parse JSON when
// the value is structured.

export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Setting = typeof settings.$inferSelect;
