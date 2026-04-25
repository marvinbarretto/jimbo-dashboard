import { Hono } from 'hono';
import { and, desc, inArray, sql } from 'drizzle-orm';
import { db } from '../../db/client';
import { vaultNotes } from '../../db/schema';

// Shape of the embedded latest activity event — joined server-side so the
// client renders without follow-up actor lookups.
interface LiveEvent {
  ts: string;
  actor_id: string;
  actor_display_name: string | null;
  action: string;
  from_value: string | null;
  to_value: string | null;
}

interface LiveMessage {
  created_at: string;
  author_actor_id: string;
  author_display_name: string | null;
  kind: string;
  body_excerpt: string;
}

// ── GET /api/vault-items ───────────────────────────────────────────────────
//
// Board-shaped list. Each row carries the data the kanban needs to render
// without follow-up requests:
//   - core vault_notes columns
//   - primary_project (id + display_name) flattened from junction
//   - open_questions_count (unresolved grooming_questions)
//   - latest_activity_at (max ts from note_activity)
//   - children_count (rows where parent_id = this.id) — drives epic display
//
// Filtering query params (all optional, AND'd):
//   ?status=active           — repeatable
//   ?grooming_status=ungroomed
//   ?assigned_to=marvin
//   ?limit=200               — default 500, hard cap 2000

export const vaultItemsRoute = new Hono();

vaultItemsRoute.get('/', async (c) => {
  const url = new URL(c.req.url);
  const statuses = url.searchParams.getAll('status');
  const grooming = url.searchParams.getAll('grooming_status');
  const assigned = url.searchParams.getAll('assigned_to');
  const limitRaw = Number(url.searchParams.get('limit') ?? '500');
  const limit = Math.min(Math.max(1, limitRaw), 2000);

  const filters = [
    statuses.length ? inArray(vaultNotes.status, statuses) : undefined,
    grooming.length ? inArray(vaultNotes.grooming_status, grooming) : undefined,
    assigned.length ? inArray(vaultNotes.assigned_to, assigned) : undefined,
  ].filter((x): x is NonNullable<typeof x> => x !== undefined);

  // Use a single SQL with correlated subqueries — cheaper than N+1 round
  // trips and lets Drizzle stream via postgres-js. The subqueries are
  // index-backed:
  //   open_qs   → idx_grooming_questions_pending (partial WHERE resolved_at IS NULL)
  //   latest_at → idx_note_activity_note (note_id, ts DESC)
  //   children  → idx_vault_parent_id
  // Primary project comes from idx_vault_item_projects_one_primary.
  const rows = await db
    .select({
      id: vaultNotes.id,
      seq: vaultNotes.seq,
      title: vaultNotes.title,
      type: vaultNotes.type,
      status: vaultNotes.status,
      grooming_status: vaultNotes.grooming_status,
      ai_priority: vaultNotes.ai_priority,
      manual_priority: vaultNotes.manual_priority,
      priority_confidence: vaultNotes.priority_confidence,
      ai_rationale: vaultNotes.ai_rationale,
      assigned_to: vaultNotes.assigned_to,
      route: vaultNotes.route,
      tags: vaultNotes.tags,
      ready: vaultNotes.ready,
      is_epic: vaultNotes.is_epic,
      parent_id: vaultNotes.parent_id,
      blocked_by: vaultNotes.blocked_by,
      blocked_reason: vaultNotes.blocked_reason,
      blocked_at: vaultNotes.blocked_at,
      due_at: vaultNotes.due_at,
      created_at: vaultNotes.created_at,
      updated_at: vaultNotes.updated_at,
      completed_at: vaultNotes.completed_at,
      grooming_started_at: vaultNotes.grooming_started_at,
      body: vaultNotes.body,
      acceptance_criteria: vaultNotes.acceptance_criteria,
      actionability: vaultNotes.actionability,
      source_kind: vaultNotes.source_kind,
      source_ref: vaultNotes.source_ref,
      source_url: vaultNotes.source_url,
      source_signal: vaultNotes.source_signal,

      // Correlated subqueries — written with explicit aliases because Drizzle's
      // template substitution drops the outer-table qualifier in subquery
      // scope, which causes "id" to bind to the inner table's column. Raw SQL
      // with hand-qualified names is unambiguous and just as type-safe via the
      // generic on sql<>.
      primary_project_id: sql<string | null>`(
        SELECT vip.project_id
        FROM "vault_item_projects" vip
        WHERE vip.vault_item_id = "vault_notes"."id"
          AND vip.is_primary = true
        LIMIT 1
      )`,
      primary_project_name: sql<string | null>`(
        SELECT p.display_name
        FROM "vault_item_projects" vip
        JOIN "projects" p ON p.id = vip.project_id
        WHERE vip.vault_item_id = "vault_notes"."id"
          AND vip.is_primary = true
        LIMIT 1
      )`,

      open_questions_count: sql<number>`(
        SELECT COUNT(*)::int
        FROM "grooming_questions" gq
        WHERE gq.note_id = "vault_notes"."id"
          AND gq.resolved_at IS NULL
      )`,

      latest_activity_at: sql<Date | null>`(
        SELECT MAX(na.ts)
        FROM "note_activity" na
        WHERE na.note_id = "vault_notes"."id"
      )`,

      // Latest note_activity row, packaged as JSON. Actor display name joined
      // here so the client doesn't need to look it up. Returns null if no
      // activity exists yet for this item.
      latest_event: sql<LiveEvent | null>`(
        SELECT json_build_object(
          'ts',                 na.ts,
          'actor_id',           na.actor,
          'actor_display_name', a.display_name,
          'action',             na.action,
          'from_value',         na.from_value,
          'to_value',           na.to_value
        )
        FROM "note_activity" na
        LEFT JOIN "actors" a ON a.id = na.actor
        WHERE na.note_id = "vault_notes"."id"
        ORDER BY na.ts DESC
        LIMIT 1
      )`,

      // Latest thread_message row. Body truncated server-side to keep the
      // payload small — the card excerpt only renders ~100 chars anyway.
      latest_message: sql<LiveMessage | null>`(
        SELECT json_build_object(
          'created_at',           tm.created_at,
          'author_actor_id',      tm.author_actor_id,
          'author_display_name',  a.display_name,
          'kind',                 tm.kind,
          'body_excerpt',         CASE
            WHEN length(tm.body) <= 120 THEN tm.body
            ELSE substr(tm.body, 1, 119) || '…'
          END
        )
        FROM "thread_messages" tm
        LEFT JOIN "actors" a ON a.id = tm.author_actor_id
        WHERE tm.vault_item_id = "vault_notes"."id"
        ORDER BY tm.created_at DESC
        LIMIT 1
      )`,

      // Days since the item entered its current grooming_status. Computed
      // from grooming_audit (most recent transition INTO this status) — drives
      // the "stuck Nd" hint on the kanban card.
      days_in_column: sql<number>`(
        SELECT COALESCE(
          EXTRACT(EPOCH FROM (NOW() - MAX(ga.created_at))) / 86400,
          0
        )::float
        FROM "grooming_audit" ga
        WHERE ga.note_id = "vault_notes"."id"
          AND ga.to_status = "vault_notes"."grooming_status"
      )`,

      children_count: sql<number>`(
        SELECT COUNT(*)::int
        FROM "vault_notes" children
        WHERE children.parent_id = "vault_notes"."id"
      )`,
    })
    .from(vaultNotes)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(vaultNotes.seq))
    .limit(limit);

  return c.json({
    items: rows,
    total: rows.length,
    limit,
  });
});
