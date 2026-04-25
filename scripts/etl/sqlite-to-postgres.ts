// ── ETL: SQLite snapshot → jimbo_pg ────────────────────────────────────────
//
// Reads .local/snapshots/context-2026-04-25.db (jimbo-api production snapshot)
// and writes into jimbo_pg via Drizzle. Idempotent — TRUNCATE CASCADE before
// loading. Synthesizes actors and projects from the flat strings/tags that
// production uses today.
//
// Run via SSH tunnel:
//   ssh -L 5433:127.0.0.1:5432 vps -N
//   node --env-file=.env --import tsx scripts/etl/sqlite-to-postgres.ts
//
// Reports per-table counts; exits non-zero on any error.

import path from 'node:path';
import Database from 'better-sqlite3';
import { sql } from 'drizzle-orm';
import { db, sql as pg } from '../../db/client';
import {
  actors, projects, vaultItemProjects,
  vaultNotes, dispatchQueue, noteActivity, systemEvents,
  threadMessages, attachments, groomingAudit, groomingQuestions,
  costs, settings,
} from '../../db/schema';

// Source SQLite path is configurable so the manual-sync endpoint can point
// the ETL at a freshly-pulled snapshot instead of the frozen one.
const SNAPSHOT = path.resolve(process.env.ETL_SOURCE_DB_PATH ?? '.local/snapshots/context-2026-04-25.db');

// ── Helpers ────────────────────────────────────────────────────────────────

// SQLite stores ISO 8601 strings ('2025-08-15T00:00:00.000Z') and naive
// timestamps from `datetime('now')` ('2026-04-23 12:50:38'). Both parse fine
// as UTC via the Date constructor.
const ts = (v: string | null | undefined): Date | null => {
  if (!v) return null;
  // Naive 'YYYY-MM-DD HH:MM:SS' from datetime('now') needs a 'Z' suffix to be
  // parsed as UTC by JS, otherwise it's parsed as local time.
  const iso = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(v) && !v.endsWith('Z')
    ? v.replace(' ', 'T') + 'Z'
    : v;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
};

const bool = (v: number | null | undefined): boolean => v === 1;

// JSON-string array → string[]. Production has two formats: real JSON arrays
// (most rows) and bare comma-separated strings (~156 vault_notes wrote tags
// without proper serialization). Try JSON, fall back to comma-split.
// Returns [] on null/empty so the NOT NULL columns stay satisfied.
let jsonArrayFallbacks = 0;
const jsonArr = (v: string | null | undefined, label: string): string[] => {
  if (!v || v === '' || v === '[]') return [];
  try {
    const parsed = JSON.parse(v);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch { /* fall through to comma-split */ }

  // Bare comma-separated form ('project:openclaw,finance,ai') — a real
  // shape we observed; preserve the tags rather than dropping them.
  const parts = v.split(',').map(s => s.trim()).filter(Boolean);
  if (parts.length > 0) {
    jsonArrayFallbacks++;
    return parts;
  }
  return [];
};

const jsonObj = (v: string | null | undefined): unknown => {
  if (!v || v === '') return null;
  try { return JSON.parse(v); } catch { return null; }
};

// Insert in batches — Postgres single-statement param limit is ~65k. Drizzle
// handles batching internally when given an array, but we cap to keep errors
// localized to a small range when something goes wrong.
const BATCH = 500;

async function insertBatched<T>(
  table: any,
  rows: T[],
  label: string,
): Promise<void> {
  if (rows.length === 0) {
    console.log(`  ${label}: 0 rows (skipped)`);
    return;
  }
  for (let i = 0; i < rows.length; i += BATCH) {
    await db.insert(table).values(rows.slice(i, i + BATCH));
  }
  console.log(`  ${label}: ${rows.length} rows`);
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const sqlite = new Database(SNAPSHOT, { readonly: true });
  console.log(`[etl] reading ${SNAPSHOT}`);
  console.log(`[etl] target: ${process.env.JIMBO_PG_DATABASE} on ${process.env.JIMBO_PG_HOST}:${process.env.JIMBO_PG_PORT}`);

  // ── Truncate all target tables (CASCADE handles FK order) ───────────────
  console.log('[etl] truncating target tables');
  await db.execute(sql`
    TRUNCATE TABLE
      vault_item_projects, attachments, thread_messages,
      grooming_audit, grooming_questions,
      note_activity, system_events, costs,
      dispatch_queue, vault_notes,
      projects, actors, settings
    RESTART IDENTITY CASCADE
  `);

  // ── Synthesize actors from distinct assigned_to + executor ──────────────
  console.log('[etl] synthesize actors');
  const actorIds = new Set<string>();
  for (const row of sqlite.prepare(
    `SELECT DISTINCT assigned_to FROM vault_notes WHERE assigned_to IS NOT NULL AND assigned_to != 'unassigned'`,
  ).all() as Array<{ assigned_to: string }>) {
    actorIds.add(row.assigned_to);
  }
  for (const row of sqlite.prepare(
    `SELECT DISTINCT executor FROM dispatch_queue WHERE executor IS NOT NULL`,
  ).all() as Array<{ executor: string }>) {
    actorIds.add(row.executor);
  }
  // Known kinds — humans vs agents. Anything we haven't seen defaults to 'agent'
  // since the bot accounts dominate the population numerically.
  const HUMAN_ACTORS = new Set(['marvin']);
  const actorRows = [...actorIds].sort().map(id => ({
    id,
    display_name: id[0].toUpperCase() + id.slice(1),
    kind: HUMAN_ACTORS.has(id) ? 'human' : 'agent',
    color_token: `--actor-${id}`,
  }));
  await insertBatched(actors, actorRows, 'actors');

  // ── Synthesize projects from "project:slug" tags ─────────────────────────
  console.log('[etl] synthesize projects');
  type TagRow = { tags: string };
  const projectIds = new Set<string>();
  const itemProjectLinks: Array<{ vault_item_id: string; project_id: string }> = [];

  for (const row of sqlite.prepare(
    `SELECT id, tags FROM vault_notes WHERE tags IS NOT NULL AND tags != ''`,
  ).all() as Array<{ id: string; tags: string }>) {
    const tags = jsonArr(row.tags, `vault_notes.tags(${row.id})`);
    for (const t of tags) {
      if (!t.startsWith('project:')) continue;
      const slug = t.slice('project:'.length);
      if (!slug) continue;
      projectIds.add(slug);
      itemProjectLinks.push({ vault_item_id: row.id, project_id: slug });
    }
  }
  const projectRows = [...projectIds].sort().map(id => ({
    id,
    display_name: id.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' '),
    status: 'active',
    color_token: `--project-${id}`,
  }));
  await insertBatched(projects, projectRows, 'projects');

  // ── vault_notes ──────────────────────────────────────────────────────────
  console.log('[etl] vault_notes');
  type VaultRow = Record<string, unknown>;
  const vaultRows = (sqlite.prepare('SELECT * FROM vault_notes').all() as VaultRow[]).map(r => {
    return {
      id: r.id as string,
      seq: r.seq as number,
      title: r.title as string,
      type: (r.type as string) ?? 'task',
      status: (r.status as string) ?? 'active',
      body: r.body as string | null,
      raw_frontmatter: jsonObj(r.raw_frontmatter as string | null),
      ai_priority: r.ai_priority as number | null,
      ai_rationale: r.ai_rationale as string | null,
      ai_rationale_model: r.ai_rationale_model as string | null,
      manual_priority: r.manual_priority as number | null,
      priority_confidence: r.priority_confidence as number | null,
      actionability: r.actionability as string | null,
      sort_position: r.sort_position as number | null,
      tags: jsonArr(r.tags as string | null, `vault_notes.tags(${r.id})`),
      assigned_to: (r.assigned_to as string) ?? 'unassigned',
      route: (r.route as string) ?? 'unrouted',
      agent_type: r.agent_type as string | null,
      executor: r.executor as string | null,
      suggested_route: r.suggested_route as string | null,
      suggested_agent_type: r.suggested_agent_type as string | null,
      suggested_ac: r.suggested_ac as string | null,
      suggested_skills: jsonArr(r.suggested_skills as string | null, `suggested_skills(${r.id})`),
      suggested_parent_id: r.suggested_parent_id as string | null,
      parent_id: r.parent_id as string | null,
      is_epic: bool(r.is_epic as number),
      epic_started_at: ts(r.epic_started_at as string | null),
      ready: bool(r.ready as number),
      grooming_status: (r.grooming_status as string) ?? 'ungroomed',
      grooming_started_at: ts(r.grooming_started_at as string | null),
      acceptance_criteria: r.acceptance_criteria as string | null,
      definition_of_done: r.definition_of_done as string | null,
      blocked_by: r.blocked_by as string | null,
      blocked_reason: r.blocked_reason as string | null,
      blocked_at: ts(r.blocked_at as string | null),
      source_kind: r.source_kind as string | null,
      source_ref: r.source_ref as string | null,
      source_url: r.source_url as string | null,
      source_signal: r.source_signal as string | null,
      cited_lesson_ids: jsonArr(r.cited_lesson_ids as string | null, `cited_lesson_ids(${r.id})`),
      nudge_count: (r.nudge_count as number) ?? 0,
      last_nudged_at: ts(r.last_nudged_at as string | null),
      retry_count: (r.retry_count as number) ?? 0,
      created_at: ts(r.created_at as string) ?? new Date(),
      updated_at: ts(r.updated_at as string) ?? new Date(),
      completed_at: ts(r.completed_at as string | null),
      due_at: ts(r.due_at as string | null),
    };
  });
  // Insert in two passes — children with parent_id pointing to other rows
  // must exist after the parents. Sort: parents first (parent_id null), then
  // children. Self-FK is satisfied this way without per-row commits.
  vaultRows.sort((a, b) => {
    if (a.parent_id == null && b.parent_id != null) return -1;
    if (a.parent_id != null && b.parent_id == null) return 1;
    return 0;
  });
  await insertBatched(vaultNotes, vaultRows, 'vault_notes');

  // After loading vault_notes, advance the seq sequence so future inserts
  // don't collide. (Not strictly needed since we insert with explicit seq,
  // but keeps the DB consistent.)
  const maxSeq = vaultRows.reduce((m, r) => r.seq > m ? r.seq : m, 0);
  if (maxSeq > 0) {
    // No sequence — seq is bigint UNIQUE, not bigserial. No reset needed.
    void maxSeq;
  }

  // ── vault_item_projects (filter to surviving vault_notes ids only) ──────
  const surviving = new Set(vaultRows.map(r => r.id));
  const linkRows = itemProjectLinks
    .filter(l => surviving.has(l.vault_item_id) && projectIds.has(l.project_id))
    .map((l, i, arr) => {
      // First link per item is primary.
      const isPrimary = arr.findIndex(x => x.vault_item_id === l.vault_item_id) === i;
      return { ...l, is_primary: isPrimary };
    });
  // Dedup composite PK collisions just in case (same tag twice).
  const linkSeen = new Set<string>();
  const linkRowsDedup = linkRows.filter(l => {
    const k = `${l.vault_item_id}::${l.project_id}`;
    if (linkSeen.has(k)) return false;
    linkSeen.add(k);
    return true;
  });
  await insertBatched(vaultItemProjects, linkRowsDedup, 'vault_item_projects');

  // ── dispatch_queue ───────────────────────────────────────────────────────
  console.log('[etl] dispatch_queue');
  const dispatchRows = (sqlite.prepare('SELECT * FROM dispatch_queue').all() as VaultRow[]).map(r => ({
    id: r.id as number,
    task_id: r.task_id as string,
    task_source: (r.task_source as string) ?? 'vault',
    flow: (r.flow as string) ?? 'commission',
    agent_type: r.agent_type as string,
    executor: r.executor as string | null,
    skill: r.skill as string | null,
    skill_context: r.skill_context as string | null,
    batch_id: r.batch_id as string | null,
    status: (r.status as string) ?? 'proposed',
    dispatch_prompt: r.dispatch_prompt as string | null,
    dispatch_repo: r.dispatch_repo as string | null,
    result_summary: r.result_summary as string | null,
    result_artifacts: r.result_artifacts as string | null,
    error_message: r.error_message as string | null,
    rejection_reason: r.rejection_reason as string | null,
    retry_count: (r.retry_count as number) ?? 0,
    issue_number: r.issue_number as number | null,
    issue_repo: r.issue_repo as string | null,
    issue_title: r.issue_title as string | null,
    issue_body: r.issue_body as string | null,
    pr_url: r.pr_url as string | null,
    pr_state: r.pr_state as string | null,
    completed_model: r.completed_model as string | null,
    proposed_at: ts(r.proposed_at as string | null),
    approved_at: ts(r.approved_at as string | null),
    rejected_at: ts(r.rejected_at as string | null),
    started_at: ts(r.started_at as string | null),
    completed_at: ts(r.completed_at as string | null),
    created_at: ts(r.created_at as string) ?? new Date(),
  }));
  await insertBatched(dispatchQueue, dispatchRows, 'dispatch_queue');
  // Advance sequence so new inserts don't collide with explicit IDs.
  if (dispatchRows.length > 0) {
    const maxId = dispatchRows.reduce((m, r) => r.id > m ? r.id : m, 0);
    await db.execute(sql.raw(`SELECT setval(pg_get_serial_sequence('dispatch_queue','id'), ${maxId})`));
  }

  // ── note_activity (only entries pointing to surviving vault notes) ──────
  console.log('[etl] note_activity');
  const activityRows = (sqlite.prepare('SELECT * FROM note_activity').all() as VaultRow[])
    .filter(r => surviving.has(r.note_id as string))
    .map(r => ({
      id: r.id as number,
      note_id: r.note_id as string,
      ts: ts(r.ts as string) ?? new Date(),
      actor: r.actor as string,
      action: r.action as string,
      from_value: r.from_value as string | null,
      to_value: r.to_value as string | null,
      reason: r.reason as string | null,
      context: jsonObj(r.context as string | null),
    }));
  await insertBatched(noteActivity, activityRows, 'note_activity');
  if (activityRows.length > 0) {
    const maxId = activityRows.reduce((m, r) => r.id > m ? r.id : m, 0);
    await db.execute(sql.raw(`SELECT setval(pg_get_serial_sequence('note_activity','id'), ${maxId})`));
  }

  // ── thread_messages ──────────────────────────────────────────────────────
  console.log('[etl] thread_messages');
  const threadRows = (sqlite.prepare('SELECT * FROM thread_messages').all() as VaultRow[])
    .filter(r => surviving.has(r.vault_item_id as string))
    .map(r => ({
      id: r.id as string,
      vault_item_id: r.vault_item_id as string,
      author_actor_id: r.author_actor_id as string,
      kind: r.kind as string,
      body: r.body as string,
      in_reply_to: r.in_reply_to as string | null,
      answered_by: r.answered_by as string | null,
      created_at: ts(r.created_at as string) ?? new Date(),
    }));
  // Sort so messages without in_reply_to come first; self-FK satisfied per batch.
  threadRows.sort((a, b) => {
    if (!a.in_reply_to && b.in_reply_to) return -1;
    if (a.in_reply_to && !b.in_reply_to) return 1;
    return a.created_at.getTime() - b.created_at.getTime();
  });
  await insertBatched(threadMessages, threadRows, 'thread_messages');

  // ── attachments (0 rows in production but include for shape) ────────────
  console.log('[etl] attachments');
  const attachmentRows = (sqlite.prepare('SELECT * FROM attachments').all() as VaultRow[]).map(r => ({
    id: r.id as string,
    thread_message_id: r.thread_message_id as string,
    kind: r.kind as string,
    filename: r.filename as string,
    mime_type: r.mime_type as string,
    size_bytes: r.size_bytes as number,
    url: r.url as string,
    caption: r.caption as string | null,
    created_at: ts(r.created_at as string) ?? new Date(),
  }));
  await insertBatched(attachments, attachmentRows, 'attachments');

  // ── grooming_audit ───────────────────────────────────────────────────────
  console.log('[etl] grooming_audit');
  const auditRows = (sqlite.prepare('SELECT * FROM grooming_audit').all() as VaultRow[])
    .filter(r => surviving.has(r.note_id as string))
    .map(r => ({
      id: r.id as number,
      note_id: r.note_id as string,
      from_status: r.from_status as string,
      to_status: r.to_status as string,
      actor: r.actor as string,
      reason: r.reason as string | null,
      metadata: jsonObj(r.metadata as string | null),
      created_at: ts(r.created_at as string) ?? new Date(),
    }));
  await insertBatched(groomingAudit, auditRows, 'grooming_audit');
  if (auditRows.length > 0) {
    const maxId = auditRows.reduce((m, r) => r.id > m ? r.id : m, 0);
    await db.execute(sql.raw(`SELECT setval(pg_get_serial_sequence('grooming_audit','id'), ${maxId})`));
  }

  // ── grooming_questions ───────────────────────────────────────────────────
  console.log('[etl] grooming_questions');
  const questionRows = (sqlite.prepare('SELECT * FROM grooming_questions').all() as VaultRow[])
    .filter(r => surviving.has(r.note_id as string))
    .map(r => ({
      id: r.id as number,
      note_id: r.note_id as string,
      question: r.question as string,
      delegable: bool(r.delegable as number),
      answer: r.answer as string | null,
      answered_by: r.answered_by as string | null,
      dispatch_id: r.dispatch_id as string | null,
      created_at: ts(r.created_at as string) ?? new Date(),
      resolved_at: ts(r.resolved_at as string | null),
    }));
  await insertBatched(groomingQuestions, questionRows, 'grooming_questions');
  if (questionRows.length > 0) {
    const maxId = questionRows.reduce((m, r) => r.id > m ? r.id : m, 0);
    await db.execute(sql.raw(`SELECT setval(pg_get_serial_sequence('grooming_questions','id'), ${maxId})`));
  }

  // ── system_events ────────────────────────────────────────────────────────
  console.log('[etl] system_events');
  const eventRows = (sqlite.prepare('SELECT * FROM system_events').all() as VaultRow[]).map(r => ({
    id: r.id as number,
    ts: ts(r.ts as string) ?? new Date(),
    source: r.source as string,
    kind: r.kind as string,
    actor: r.actor as string | null,
    title: r.title as string,
    detail: r.detail as string | null,
    ref_type: r.ref_type as string | null,
    ref_id: r.ref_id as string | null,
    correlation_id: r.correlation_id as string | null,
    level: (r.level as string) ?? 'info',
  }));
  await insertBatched(systemEvents, eventRows, 'system_events');
  if (eventRows.length > 0) {
    const maxId = eventRows.reduce((m, r) => r.id > m ? r.id : m, 0);
    await db.execute(sql.raw(`SELECT setval(pg_get_serial_sequence('system_events','id'), ${maxId})`));
  }

  // ── costs ────────────────────────────────────────────────────────────────
  console.log('[etl] costs');
  const costRows = (sqlite.prepare('SELECT * FROM costs').all() as VaultRow[]).map(r => ({
    id: r.id as string,
    timestamp: ts(r.timestamp as string) ?? new Date(),
    provider: r.provider as string,
    model: r.model as string,
    task_type: r.task_type as string,
    input_tokens: r.input_tokens as number,
    output_tokens: r.output_tokens as number,
    estimated_cost: r.estimated_cost as number,
    notes: r.notes as string | null,
  }));
  await insertBatched(costs, costRows, 'costs');

  // ── settings ─────────────────────────────────────────────────────────────
  console.log('[etl] settings');
  const settingsRows = (sqlite.prepare('SELECT * FROM settings').all() as VaultRow[]).map(r => ({
    key: r.key as string,
    value: r.value as string,
    updated_at: ts(r.updated_at as string) ?? new Date(),
  }));
  await insertBatched(settings, settingsRows, 'settings');

  // ── Done ─────────────────────────────────────────────────────────────────
  sqlite.close();
  console.log('[etl] done');
  if (jsonArrayFallbacks > 0) {
    console.log(`[etl] ${jsonArrayFallbacks} tag values used comma-split fallback`);
  }
}

main()
  .then(async () => { await pg.end(); process.exit(0); })
  .catch(async (err) => {
    console.error('[etl] FAILED', err);
    await pg.end().catch(() => {});
    process.exit(1);
  });
