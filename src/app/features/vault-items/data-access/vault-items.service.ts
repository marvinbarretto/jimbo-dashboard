// Reads from the dashboard's new Hono+Drizzle API at /api/vault-items, which
// in turn reads from the jimbo_pg Postgres (the PoC entity store).
//
// Mutations still go via the legacy PostgREST path until we add write
// endpoints to the new API. Seed mode is preserved for offline UI work.

import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import type { VaultItem, CreateVaultItemPayload, UpdateVaultItemPayload, GroomingStatus, VaultItemType, Priority, Actionability } from '@domain/vault/vault-item';
import { isActive } from '@domain/vault/vault-item';
import type { ActorId, VaultItemId } from '@domain/ids';
import type { VaultActivityEvent } from '@domain/activity/activity-event';
import { vaultItemId, actorId } from '@domain/ids';
import { environment } from '../../../../environments/environment';
import { ActivityEventsService } from './activity-events.service';
import { isSeedMode } from '@shared/seed-mode';
import { SEED } from '@domain/seed';

// Convenience alias — the union parameter type for post(). Vault-side only.
// Distributive Omit so each variant loses id/at independently.
type CreatePayload<T> = T extends unknown ? Omit<T, 'id' | 'at'> : never;
type EventPayload = CreatePayload<VaultActivityEvent>;

@Injectable({ providedIn: 'root' })
export class VaultItemsService {
  private readonly http = inject(HttpClient);
  private readonly activityService = inject(ActivityEventsService);
  private readonly url = `${environment.apiUrl}/vault-items`;

  private readonly _items = signal<VaultItem[]>([]);
  private readonly _loading = signal(true);

  readonly items = this._items.asReadonly();
  readonly activeItems = computed(() => this._items().filter(isActive));
  readonly isLoading = this._loading.asReadonly();

  // Hardcoded operator; real session context is a later pass.
  private readonly currentActorId: ActorId = actorId('marvin');

  constructor() { this.load(); }

  private load(): void {
    if (isSeedMode()) {
      this._items.set([...SEED.vault_items]);
      this._loading.set(false);
      return;
    }
    // /api/vault-items returns the board-shaped response from the new Hono
    // service (jimbo_pg-backed). Map each row to the dashboard's VaultItem
    // shape — the production schema is wider than VaultItem and uses
    // different conventions (status: 'archived' instead of archived_at, etc.),
    // so we adapt at the boundary rather than reshape every consumer.
    this.http.get<ApiVaultItemsResponse>(`/api/vault-items?limit=2000`).subscribe({
      next: ({ items }) => { this._items.set(items.map(toVaultItem)); this._loading.set(false); },
      error: ()         => this._loading.set(false),
    });
  }

  getById(id: VaultItemId): VaultItem | undefined {
    return this._items().find(i => i.id === id);
  }

  getBySeq(seq: number): VaultItem | undefined {
    return this._items().find(i => i.seq === seq);
  }

  // Optimistic create. `created` event emitted after server confirms — we need
  // the real vault_item_id, so we can't emit the event against the temp id.
  create(payload: CreateVaultItemPayload): void {
    const now = new Date().toISOString();
    // Temp id and seq for the optimistic row; server will assign real values on confirm.
    const tempId = vaultItemId(crypto.randomUUID());
    const optimistic: VaultItem = { ...payload, id: tempId, seq: -1, archived_at: null, created_at: now };
    this._items.update(items => [...items, optimistic]);

    if (isSeedMode()) {
      // No server to assign a real seq — keep the temp row, emit the event.
      this.activityService.post({
        type: 'created',
        vault_item_id: tempId,
        actor_id: this.currentActorId,
      });
      return;
    }

    this.http.post<VaultItem[]>(this.url, payload, { headers: { Prefer: 'return=representation' } })
      .subscribe({
        next: ([created]) => {
          this._items.update(items => items.map(i => i.id === tempId ? created : i));
          // Emit after reconcile so the event carries the real vault_item_id.
          this.activityService.post({
            type: 'created',
            vault_item_id: created.id,
            actor_id: this.currentActorId,
          });
        },
        error: () => this._items.update(items => items.filter(i => i.id !== tempId)),
      });
  }

  // Generic patch. Does not emit an event — callers use semantic mutations below
  // for anything that has a meaningful audit trail. Callers MUST NOT pass
  // `completed_at` or `archived_at` here — those are owned by `setCompleted` /
  // `archive` respectively.
  update(id: VaultItemId, patch: UpdateVaultItemPayload): void {
    const prior = this.getById(id);
    if (!prior) return;
    const optimistic = { ...prior, ...patch };
    this._items.update(items => items.map(i => i.id === id ? optimistic : i));

    if (isSeedMode()) return;

    const params = new HttpParams().set('id', `eq.${id}`);
    this.http.patch<VaultItem[]>(this.url, patch, { params, headers: { Prefer: 'return=representation' } })
      .subscribe({
        next: ([updated]) => this._items.update(items => items.map(i => i.id === id ? updated : i)),
        error: ()          => this._items.update(items => items.map(i => i.id === id ? prior : i)),
      });
  }

  // Sets archived_at and emits an `archived` event. Mirror method `unarchive` clears it.
  archive(id: VaultItemId, note: string | null = null): void {
    const prior = this.getById(id);
    if (!prior || prior.archived_at !== null) return;
    const now = new Date().toISOString();
    const patch: UpdateVaultItemPayload = { archived_at: now };
    const optimistic = { ...prior, ...patch };
    this._items.update(items => items.map(i => i.id === id ? optimistic : i));

    const event: EventPayload = {
      type: 'archived',
      vault_item_id: id,
      actor_id: this.currentActorId,
      archived_at: now,
      note,
    };

    if (isSeedMode()) {
      this.activityService.post(event);
      return;
    }

    const params = new HttpParams().set('id', `eq.${id}`);
    this.http.patch<VaultItem[]>(this.url, patch, { params, headers: { Prefer: 'return=representation' } })
      .subscribe({
        next: ([updated]) => {
          this._items.update(items => items.map(i => i.id === id ? updated : i));
          this.activityService.post(event);
        },
        error: () => this._items.update(items => items.map(i => i.id === id ? prior : i)),
      });
  }

  unarchive(id: VaultItemId, note: string | null = null): void {
    const prior = this.getById(id);
    if (!prior || prior.archived_at === null) return;
    const patch: UpdateVaultItemPayload = { archived_at: null };
    const optimistic = { ...prior, ...patch };
    this._items.update(items => items.map(i => i.id === id ? optimistic : i));

    const event: EventPayload = {
      type: 'unarchived',
      vault_item_id: id,
      actor_id: this.currentActorId,
      note,
    };

    if (isSeedMode()) {
      this.activityService.post(event);
      return;
    }

    const params = new HttpParams().set('id', `eq.${id}`);
    this.http.patch<VaultItem[]>(this.url, patch, { params, headers: { Prefer: 'return=representation' } })
      .subscribe({
        next: ([updated]) => {
          this._items.update(items => items.map(i => i.id === id ? updated : i));
          this.activityService.post(event);
        },
        error: () => this._items.update(items => items.map(i => i.id === id ? prior : i)),
      });
  }

  // Sets `completed_at` and emits a `completion_changed` event. Pass null to un-mark.
  // The single place this column is written.
  setCompleted(id: VaultItemId, completed: boolean, note: string | null = null): void {
    const prior = this.getById(id);
    if (!prior) return;
    const from = prior.completed_at;
    const to   = completed ? new Date().toISOString() : null;
    if (from === to) return; // no-op
    const patch: UpdateVaultItemPayload = { completed_at: to };
    const optimistic = { ...prior, ...patch };
    this._items.update(items => items.map(i => i.id === id ? optimistic : i));

    const event: EventPayload = {
      type: 'completion_changed',
      vault_item_id: id,
      actor_id: this.currentActorId,
      from,
      to,
      note,
    };

    if (isSeedMode()) {
      this.activityService.post(event);
      return;
    }

    const params = new HttpParams().set('id', `eq.${id}`);
    this.http.patch<VaultItem[]>(this.url, patch, { params, headers: { Prefer: 'return=representation' } })
      .subscribe({
        next: ([updated]) => {
          this._items.update(items => items.map(i => i.id === id ? updated : i));
          this.activityService.post(event);
        },
        error: () => this._items.update(items => items.map(i => i.id === id ? prior : i)),
      });
  }

  // The single place `grooming_status` is written. Emits a `grooming_status_changed`
  // event so kanban drag-drop and skill-driven transitions both leave audit trail.
  setGroomingStatus(id: VaultItemId, next: GroomingStatus, note: string | null = null): void {
    const prior = this.getById(id);
    if (!prior) return;
    const from = prior.grooming_status;
    if (from === next) return; // no-op
    const patch: UpdateVaultItemPayload = { grooming_status: next };
    const optimistic = { ...prior, ...patch };
    this._items.update(items => items.map(i => i.id === id ? optimistic : i));

    const event: EventPayload = {
      type: 'grooming_status_changed',
      vault_item_id: id,
      actor_id: this.currentActorId,
      from,
      to: next,
      note,
    };

    if (isSeedMode()) {
      this.activityService.post(event);
      return;
    }

    const params = new HttpParams().set('id', `eq.${id}`);
    this.http.patch<VaultItem[]>(this.url, patch, { params, headers: { Prefer: 'return=representation' } })
      .subscribe({
        next: ([updated]) => {
          this._items.update(items => items.map(i => i.id === id ? updated : i));
          this.activityService.post(event);
        },
        error: () => this._items.update(items => items.map(i => i.id === id ? prior : i)),
      });
  }

  // Patches assigned_to; emits assigned event with prior actor captured before the patch.
  reassign(id: VaultItemId, toActorId: ActorId, reason: string | null): void {
    const prior = this.getById(id);
    if (!prior) return;
    const fromActorId = prior.assigned_to;
    const patch: UpdateVaultItemPayload = { assigned_to: toActorId };
    const optimistic = { ...prior, assigned_to: toActorId };
    this._items.update(items => items.map(i => i.id === id ? optimistic : i));

    const event: EventPayload = {
      type: 'assigned',
      vault_item_id: id,
      actor_id: this.currentActorId,
      from_actor_id: fromActorId,
      to_actor_id: toActorId,
      reason,
    };

    if (isSeedMode()) {
      this.activityService.post(event);
      return;
    }

    const params = new HttpParams().set('id', `eq.${id}`);
    this.http.patch<VaultItem[]>(this.url, patch, { params, headers: { Prefer: 'return=representation' } })
      .subscribe({
        next: ([updated]) => {
          this._items.update(items => items.map(i => i.id === id ? updated : i));
          this.activityService.post(event);
        },
        error: () => this._items.update(items => items.map(i => i.id === id ? prior : i)),
      });
  }

  // Hard delete. Prefer archive() for most use cases.
  remove(id: VaultItemId): void {
    const prior = this.getById(id);
    this._items.update(items => items.filter(i => i.id !== id));

    if (isSeedMode()) return;

    const params = new HttpParams().set('id', `eq.${id}`);
    this.http.delete(this.url, { params })
      .subscribe({
        error: () => {
          // Rollback — put the item back in its original position best-effort.
          if (prior) this._items.update(items => [...items, prior]);
        },
      });
  }
}

// ── API response adaptation ────────────────────────────────────────────────
// The new /api/vault-items endpoint returns the production schema shape, which
// is wider and uses different conventions than the dashboard's VaultItem.
// Map at the boundary so consumers don't need to know about the drift.

interface ApiVaultItem {
  id: string;
  seq: number;
  title: string;
  type: string;                                    // 16+ values in production
  status: 'active' | 'inbox' | 'archived' | 'done';
  body: string | null;
  ai_priority: number | null;
  manual_priority: number | null;
  priority_confidence: number | null;
  ai_rationale: string | null;
  actionability: string | null;
  assigned_to: string;
  route: string;
  tags: string[];
  ready: boolean;
  is_epic: boolean;
  parent_id: string | null;
  acceptance_criteria: string | null;              // production stores as text
  blocked_by: string | null;
  blocked_reason: string | null;
  blocked_at: string | null;
  due_at: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  grooming_status: string;
  grooming_started_at: string | null;
  source_kind: string | null;
  source_ref: string | null;
  source_url: string | null;
  source_signal: string | null;

  // Embedded — used by the board directly, not by the VaultItem shape.
  primary_project_id: string | null;
  primary_project_name: string | null;
  open_questions_count: number;
  latest_activity_at: string | null;
  children_count: number;
}

interface ApiVaultItemsResponse {
  items: ApiVaultItem[];
  total: number;
  limit: number;
}

// Production has many type values (task/idea/bookmark/travel/recipe/...);
// the dashboard's VaultItem narrows to three. Anything outside the union
// falls back to 'note' — we'll widen the union when the UI needs to.
function narrowType(t: string): VaultItemType {
  return t === 'task' || t === 'bookmark' || t === 'note' ? t : 'note';
}

// Production has 6 grooming statuses; dashboard has 7. The extra one
// ('intake_complete') doesn't exist in the data, so any production value
// passes through; legacy 'intake_complete' stays valid in the type.
function narrowGroomingStatus(s: string): GroomingStatus {
  const valid: readonly GroomingStatus[] = ['ungroomed','intake_rejected','intake_complete','classified','decomposed','ready'];
  return (valid as readonly string[]).includes(s) ? s as GroomingStatus : 'ungroomed';
}

function narrowActionability(a: string | null): Actionability | null {
  return a === 'clear' || a === 'needs-breakdown' || a === 'vague' ? a : null;
}

function narrowPriority(p: number | null): Priority | null {
  return p === 0 || p === 1 || p === 2 || p === 3 ? p : null;
}

function toVaultItem(a: ApiVaultItem): VaultItem {
  return {
    id: vaultItemId(a.id),
    seq: a.seq,
    title: a.title,
    body: a.body ?? '',
    type: narrowType(a.type),
    assigned_to: a.assigned_to === 'unassigned' ? null : actorId(a.assigned_to),
    tags: a.tags,
    // Production stores acceptance_criteria as free text; the dashboard expects
    // a parsed array. Until we have a parser, surface as a single unchecked item
    // when text is present, [] otherwise.
    acceptance_criteria: a.acceptance_criteria
      ? [{ text: a.acceptance_criteria, done: false }]
      : [],
    grooming_status: narrowGroomingStatus(a.grooming_status),
    ai_priority: narrowPriority(a.ai_priority),
    manual_priority: narrowPriority(a.manual_priority),
    ai_rationale: a.ai_rationale,
    priority_confidence: a.priority_confidence,
    actionability: narrowActionability(a.actionability),
    parent_id: a.parent_id ? vaultItemId(a.parent_id) : null,
    // Dashboard's archived_at is derived; production uses status='archived'.
    // Reconstruct an archived_at from updated_at when archived.
    archived_at: a.status === 'archived' ? a.updated_at : null,
    due_at: a.due_at,
    completed_at: a.completed_at,
    // Production splits source into kind/ref/url; the dashboard's Source union
    // is richer than we can honestly reconstruct. Surface null for now —
    // detail page can re-fetch and parse properly when needed.
    source: null,
    created_at: a.created_at,
  };
}
