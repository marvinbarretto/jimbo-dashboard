// Vault note activity timeline via dashboard-api at /api/note-activity
// (jimbo_pg-backed). Phase 3 part 3 of Phase C — replaces legacy PostgREST.
//
// Schema mismatch: backend `note_activity` has flat columns (action,
// from_value, to_value, reason, context). Frontend `VaultActivityEvent`
// is a discriminated union. `toVaultEvent` adapts between them. Unknown
// action strings get filtered out so consumers always see a typed event.

import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import type { VaultActivityEvent } from '@domain/activity/activity-event';
import { isVaultEvent } from '@domain/activity/activity-event';
import type { ActivityEvent } from '@domain/activity/activity-event';
import type { GroomingStatus } from '@domain/vault/vault-item';
import type { VaultItemId } from '@domain/ids';
import { activityId, actorId, vaultItemId, skillId, dispatchId } from '@domain/ids';
import { environment } from '../../../../environments/environment';
import { isSeedMode } from '@shared/seed-mode';
import { SEED } from '@domain/seed';

type CreatePayload<T> = T extends unknown ? Omit<T, 'id' | 'at'> : never;
type EventPayload = CreatePayload<VaultActivityEvent>;

interface ApiNoteActivity {
  id: number;
  note_id: string;
  ts: string;
  actor: string;
  action: string;
  from_value: string | null;
  to_value: string | null;
  reason: string | null;
  context: Record<string, unknown> | null;
}

@Injectable({ providedIn: 'root' })
export class ActivityEventsService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.dashboardApiUrl}/api/note-activity`;

  private readonly _eventsByItem = signal<Record<string, VaultActivityEvent[]>>({});

  eventsFor(vaultItemId: VaultItemId) {
    return computed(() => {
      const events = this._eventsByItem()[vaultItemId] ?? [];
      return [...events].sort((a, b) => b.at.localeCompare(a.at));
    });
  }

  loadFor(id: VaultItemId): void {
    if (isSeedMode()) {
      const all = SEED.activity_events as readonly ActivityEvent[];
      const data: VaultActivityEvent[] = all.filter(isVaultEvent).filter(e => e.vault_item_id === id);
      this._eventsByItem.update(map => ({ ...map, [id]: [...data] }));
      return;
    }
    const params = new HttpParams().set('note_id', id);
    this.http.get<{ items: ApiNoteActivity[] }>(this.url, { params }).subscribe({
      next: ({ items }) => {
        const events = items.map(toVaultEvent).filter((e): e is VaultActivityEvent => e !== null);
        this._eventsByItem.update(map => ({ ...map, [id]: events }));
      },
      // Setting an empty array on error is the right UI state (no timeline)
      // but a console error is still worth having so a permanently-empty
      // activity log is debuggable rather than mystery.
      error: (err) => {
        console.error('[activity-events] loadFor failed:', err);
        this._eventsByItem.update(map => ({ ...map, [id]: [] }));
      },
    });
  }

  // Production backend writes note_activity rows server-side as a side effect
  // of the underlying mutation (PATCH /vault/notes, reassign, etc.). The
  // dashboard does NOT post events directly — the API has no POST on
  // /api/note-activity. Optimistic local insert keeps the UI fresh in the
  // current session; the next loadFor() pulls the canonical row.
  post(event: EventPayload): void {
    const now = new Date().toISOString();
    const tempId = activityId(crypto.randomUUID());
    const optimistic = { ...event, id: tempId, at: now } as VaultActivityEvent;
    const key = event.vault_item_id;

    this._eventsByItem.update(map => ({ ...map, [key]: [...(map[key] ?? []), optimistic] }));
  }
}

// Map flat note_activity row → typed VaultActivityEvent. Returns null
// when the action string isn't a known case OR when the row lacks fields
// the typed event requires. The dashboard's union is richer than the
// audit table can capture; we only emit what we can faithfully reconstruct.
function toVaultEvent(row: ApiNoteActivity): VaultActivityEvent | null {
  const base = {
    id: activityId(String(row.id)),
    at: row.ts,
    vault_item_id: vaultItemId(row.note_id),
    actor_id: actorId(row.actor),
  };
  switch (row.action) {
    case 'created':
      return { ...base, type: 'created' };
    case 'archived':
      return { ...base, type: 'archived', archived_at: row.ts, note: row.reason };
    case 'unarchived':
      return { ...base, type: 'unarchived', note: row.reason };
    case 'assigned':
    case 'reassigned':
      if (!row.to_value) return null;
      return {
        ...base, type: 'assigned',
        from_actor_id: row.from_value ? actorId(row.from_value) : null,
        to_actor_id: actorId(row.to_value),
        reason: row.reason,
      };
    // Grooming agent runs that submit a result — surfaced as agent_run_completed
    // so the deep-read disposition / decomposition / analysis shows in the item's
    // activity timeline (under the "agent" filter) instead of being dropped.
    case 'submitted_deepread':
      return agentRun(base, 'dispatch/vault-deep-read', row);
    case 'submitted_decomposition':
      return agentRun(base, 'dispatch/vault-decompose', row);
    case 'submitted_analysis':
      return agentRun(base, 'dispatch/vault-analyse', row);
    case 'completion_changed':
      return {
        ...base, type: 'completion_changed',
        from: row.from_value, to: row.to_value, note: row.reason,
      };
    case 'grooming_status_changed': {
      const from = row.from_value as GroomingStatus | null;
      const to = row.to_value as GroomingStatus | null;
      if (!to) return null; // grooming_status changes always have a to-value
      return { ...base, type: 'grooming_status_changed', from: from as GroomingStatus, to, note: row.reason };
    }
    // thread_message_posted requires message_id + message_kind which the
    // audit row doesn't store directly. Skip until the table grows fields
    // or we read from thread_messages instead.
    default:
      return null;
  }
}

// Base shape shared by every mapped event — derived from the id constructors so
// we don't import the branded types just to annotate a helper param.
type EventBase = {
  id: ReturnType<typeof activityId>;
  at: string;
  vault_item_id: ReturnType<typeof vaultItemId>;
  actor_id: ReturnType<typeof actorId>;
};

// Adapt a grooming submit audit row into an agent_run_completed event. `summary`
// carries the disposition (e.g. "deep-read: ask — …"); model/dispatch come from
// the row's context blob when present.
function agentRun(base: EventBase, skill: string, row: ApiNoteActivity): VaultActivityEvent {
  // context arrives as a JSON string from the API (see ApiNoteActivity) — parse
  // it to read the dispatch id / model and the joined cost rollup (context._run).
  const ctx = parseContext(row.context);
  const runRaw = ctx['_run'];
  const run: Record<string, unknown> = (typeof runRaw === 'object' && runRaw !== null) ? runRaw as Record<string, unknown> : {};
  const did = ctx['dispatch_id'];
  return {
    ...base,
    type: 'agent_run_completed',
    skill_id: skillId(skill),
    dispatch_id: did != null ? dispatchId(String(did)) : null,
    outcome: 'success',
    summary: row.reason ?? '',
    decisions: null,
    reasoning: null,
    from_status: null,
    to_status: null,
    duration_ms: num(run['duration_ms']),
    model_id: str(ctx['model']),
    tokens_in: num(run['tokens_in']),
    tokens_out: num(run['tokens_out']),
    tokens_cached: num(run['tokens_cached']),
    cost_usd: num(run['cost_usd']),
    error: null,
    log_lines: null,
  };
}

// The note-activity API serialises `context` as a JSON string. Parse defensively
// — older rows or non-grooming actions may have no context or a bare object.
function parseContext(c: unknown): Record<string, unknown> {
  if (c == null) return {};
  if (typeof c === 'string') {
    try { const p: unknown = JSON.parse(c); return (p !== null && typeof p === 'object') ? p as Record<string, unknown> : {}; }
    catch { return {}; }
  }
  if (typeof c === 'object') return c as Record<string, unknown>;
  return {};
}

function num(v: unknown): number | null { return typeof v === 'number' ? v : null; }
function str(v: unknown): string | null { return typeof v === 'string' ? v : null; }

