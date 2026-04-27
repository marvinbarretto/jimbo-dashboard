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
import { activityId, actorId, vaultItemId } from '@domain/ids';
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
      error: () => this._eventsByItem.update(map => ({ ...map, [id]: [] })),
    });
  }

  post(event: EventPayload): void {
    const now = new Date().toISOString();
    const tempId = activityId(crypto.randomUUID());
    const optimistic = { ...event, id: tempId, at: now } as VaultActivityEvent;
    const key = event.vault_item_id;

    this._eventsByItem.update(map => ({ ...map, [key]: [...(map[key] ?? []), optimistic] }));

    if (isSeedMode()) return;

    const body = toApiBody(event);
    this.http.post<ApiNoteActivity>(this.url, body).subscribe({
      next: saved => {
        const adapted = toVaultEvent(saved);
        if (!adapted) return;
        this._eventsByItem.update(map => ({
          ...map,
          [key]: (map[key] ?? []).map(e => e.id === tempId ? adapted : e),
        }));
      },
      error: () => {},
    });
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
      if (!row.to_value) return null;
      return {
        ...base, type: 'assigned',
        from_actor_id: row.from_value ? actorId(row.from_value) : null,
        to_actor_id: actorId(row.to_value),
        reason: row.reason,
      };
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

// Map typed event → flat note_activity row body for POST.
function toApiBody(event: EventPayload): Partial<ApiNoteActivity> {
  const base = {
    note_id: event.vault_item_id as string,
    actor: event.actor_id as string,
    action: event.type,
  };
  // `as any` — discriminated narrowing on the union is unwieldy here; the
  // runtime fields exist per type and the shape is well-tested at the call
  // site. Server validates via Zod.
  const e = event as Record<string, unknown>;
  return {
    ...base,
    from_value: typeof e['from'] === 'string' ? e['from'] : typeof e['from_actor_id'] === 'string' ? e['from_actor_id'] : null,
    to_value: typeof e['to'] === 'string' ? e['to'] : typeof e['to_actor_id'] === 'string' ? e['to_actor_id'] : typeof e['kind'] === 'string' ? e['kind'] : typeof e['completed'] === 'boolean' ? String(e['completed']) : null,
    reason: typeof e['reason'] === 'string' ? e['reason'] : null,
  };
}
