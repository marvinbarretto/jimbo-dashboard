import { sql } from 'drizzle-orm';
import { pgTable, text, integer, timestamp, index, check, bigserial } from 'drizzle-orm/pg-core';

// ── shopping_items ─────────────────────────────────────────────────────────
//
// Active shopping list. Kept separate from vault_notes by design: items are
// low-signal, high-churn (~1000 entries/year that turn over completely),
// and need first-class structured fields (qty, unit, store, url) so future
// agent-driven ordering can map them to vendor APIs without parsing prose.
//
// status flips active → bought when checked off. Hard delete is also fine
// (and the wrapper exposes it) — bought items have no archival value.

export const shoppingItems = pgTable('shopping_items', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),

  name: text('name').notNull(),
  qty: integer('qty').notNull().default(1),

  unit: text('unit'),
  note: text('note'),
  url: text('url'),
  store: text('store'),

  status: text('status').notNull().default('active'),

  added_at: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
  checked_at: timestamp('checked_at', { withTimezone: true }),
}, (t) => ({
  qtyCheck: check('shopping_items_qty_check', sql`${t.qty} > 0`),
  statusCheck: check(
    'shopping_items_status_check',
    sql`${t.status} IN ('active','bought')`,
  ),
  statusAddedIdx: index('idx_shopping_items_status_added').on(t.status, t.added_at),
}));

export type ShoppingItem = typeof shoppingItems.$inferSelect;
export type ShoppingItemInsert = typeof shoppingItems.$inferInsert;
