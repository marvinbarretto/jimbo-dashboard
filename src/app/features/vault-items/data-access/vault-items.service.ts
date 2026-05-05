// Reads from jimbo-api /api/vault/board (board-shaped enriched query).
// Mutations go to /api/vault/notes (by-seq variants). Seed mode is preserved
// for offline UI work.

import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { VaultItem, CreateVaultItemPayload, UpdateVaultItemPayload, GroomingStatus, VaultItemType, VaultItemCategory, Priority, Actionability } from '@domain/vault/vault-item';
import { isActive } from '@domain/vault/vault-item';
import type { Source } from '@domain/vault/source';
import type { ActorId, VaultItemId } from '@domain/ids';
import type { VaultActivityEvent } from '@domain/activity/activity-event';
import { vaultItemId, actorId, threadMessageId } from '@domain/ids';
import { environment } from '../../../../environments/environment';
import { ActivityEventsService } from './activity-events.service';
import { ToastService } from '@shared/components/toast/toast.service';
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
  private readonly toast = inject(ToastService);
  private readonly url = `${environment.dashboardApiUrl}/api/vault/notes`;

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
    this.http.get<ApiVaultItemsResponse>(`${environment.dashboardApiUrl}/api/vault/board?limit=2000`).subscribe({
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

  // Lightweight create for board-level "+ new" inputs. Posts the small slice the
  // API actually accepts (CreateNoteBody — title/type/manual_priority/...), then
  // PATCHes grooming_status/assigned_to as a follow-up if they differ from server
  // defaults (CreateNoteBody doesn't accept grooming_status directly).
  // Use this from board UIs; reserve `create()` for the full vault-item-form.
  createOnBoard(input: {
    title: string;
    type?: 'task' | 'note' | 'bookmark';
    grooming_status?: GroomingStatus;
    manual_priority?: Priority;
  }, onCreated?: (item: VaultItem) => void): void {
    const trimmed = input.title.trim();
    if (!trimmed) return;
    const now = new Date().toISOString();
    const tempId = vaultItemId(crypto.randomUUID());
    const type = input.type ?? 'task';
    const groomingStatus = input.grooming_status ?? 'ungroomed';

    const optimistic: VaultItem = {
      id: tempId, seq: -1, title: trimmed, body: '',
      type, category: null,
      assigned_to: this.currentActorId, tags: [],
      acceptance_criteria: [],
      grooming_status: groomingStatus,
      ai_priority: null, manual_priority: input.manual_priority ?? null,
      ai_rationale: null, priority_confidence: null,
      actionability: null, parent_id: null,
      archived_at: null, due_at: null, completed_at: null,
      source: { kind: 'manual', ref: 'board', url: null },
      created_at: now,
      primary_project_id: null, primary_project_name: null,
      open_questions_count: 0, latest_activity_at: null,
      children_count: 0, latest_event: null, latest_message: null,
      days_in_column: 0,
    };
    this._items.update(items => [optimistic, ...items]);

    if (isSeedMode()) return;

    // source_kind/source_ref tag the row as operator-created so the execution
    // board's manual-track filter (`source.kind === 'manual'`) survives reload.
    const body: Record<string, unknown> = {
      title: trimmed,
      type,
      source_kind: 'manual',
      source_ref: 'board',
    };
    if (input.manual_priority != null) body['manual_priority'] = input.manual_priority;

    this.http.post<ApiVaultNoteResponse>(this.url, body).subscribe({
      next: (note) => {
        const realId = vaultItemId(note.id);
        const realSeq = Number(note.seq);
        const real: VaultItem = { ...optimistic, id: realId, seq: realSeq };
        this._items.update(items => items.map(i => i.id === tempId ? real : i));
        this.toast.success(`"${trimmed}" created · #${realSeq}`);
        // Caller (typically a board) gets the real seq so it can deep-link
        // straight into the detail dialog for in-place editing.
        onCreated?.(real);

        // CreateNoteBody doesn't accept grooming_status or assigned_to overrides
        // for board-driven flows — the server defaults to ungroomed/jimbo. PATCH
        // any drift in a follow-up so the UI sees what we asked for.
        const patch: Record<string, unknown> = {};
        if (groomingStatus !== 'ungroomed') patch['grooming_status'] = groomingStatus;
        if (note.assigned_to !== this.currentActorId) patch['assigned_to'] = this.currentActorId;
        if (Object.keys(patch).length === 0) return;
        this.http.patch<ApiVaultNoteResponse>(`${this.url}/by-seq/${realSeq}`, patch).subscribe({
          next: () => this._items.update(items => items.map(i => i.id === realId
            ? { ...i, grooming_status: groomingStatus, assigned_to: this.currentActorId }
            : i)),
          error: () => this.toast.error('Created but status/owner follow-up failed'),
        });
      },
      error: () => {
        this._items.update(items => items.filter(i => i.id !== tempId));
        this.toast.error(`Failed to create "${trimmed}"`);
      },
    });
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

    // The API's CreateNoteBody is a slim subset of the dashboard's payload
    // (no nested `source`, no array tags/AC, no derived embeds) — flatten before posting.
    const body = toApiCreateBody(payload);

    this.http.post<ApiVaultNoteResponse>(this.url, body)
      .subscribe({
        next: (created) => {
          // Keep the optimistic shape (which is already correct) and just splice in
          // the server-managed fields. The raw API response is the production VaultNote
          // shape (string tags, null AC, no embeds) — replacing wholesale would corrupt
          // the row until the next board reload.
          const realId = vaultItemId(created.id);
          const realSeq = Number(created.seq);
          this._items.update(items => items.map(i => i.id === tempId
            ? { ...optimistic, id: realId, seq: realSeq, created_at: created.created_at ?? now }
            : i));
          this.activityService.post({
            type: 'created',
            vault_item_id: realId,
            actor_id: this.currentActorId,
          });
          // Apply any fields the create endpoint doesn't accept (grooming_status,
          // assigned_to overrides, archived_at) as a follow-up PATCH, so the
          // server state matches what the form asked for.
          const followUp = createFollowUpPatch(payload);
          if (Object.keys(followUp).length > 0) {
            this.http.patch<ApiVaultNoteResponse>(`${this.url}/by-seq/${realSeq}`, followUp).subscribe({
              error: () => this.toast.error('Created but follow-up update failed'),
            });
          }
          this.toast.success(`"${payload.title}" created`);
        },
        error: () => {
          this._items.update(items => items.filter(i => i.id !== tempId));
          this.toast.error(`Failed to create "${payload.title}"`);
        },
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

    const body = toApiUpdateBody(patch);
    this.http.patch<ApiVaultNoteResponse>(`${this.url}/by-seq/${prior.seq}`, body)
      .subscribe({
        // Trust the optimistic shape — the API response is the wider production
        // VaultNote (different shape from VaultItem); replacing it wholesale would
        // corrupt the row.
        next: () => {},
        error: () => {
          this._items.update(items => items.map(i => i.id === id ? prior : i));
          this.toast.error('Update failed — changes reverted');
        },
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

    // API doesn't accept `archived_at` — production uses `status='archived'`.
    // The dashboard keeps the derived `archived_at` locally for lifecycle helpers.
    this.http.patch<ApiVaultNoteResponse>(`${this.url}/by-seq/${prior.seq}`, { status: 'archived' })
      .subscribe({
        next: () => {
          this.activityService.post(event);
          this.toast.success(`"${prior.title}" archived`);
        },
        error: () => {
          this._items.update(items => items.map(i => i.id === id ? prior : i));
          this.toast.error(`Archive failed — "${prior.title}" reverted`);
        },
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

    // Mirror of archive() — API uses `status` not `archived_at`.
    this.http.patch<ApiVaultNoteResponse>(`${this.url}/by-seq/${prior.seq}`, { status: 'active' })
      .subscribe({
        next: () => {
          this.activityService.post(event);
          this.toast.success(`"${prior.title}" restored`);
        },
        error: () => {
          this._items.update(items => items.map(i => i.id === id ? prior : i));
          this.toast.error(`Restore failed — "${prior.title}" reverted`);
        },
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

    // API doesn't accept `completed_at` directly — write `status='done'` and the
    // server stamps completed_at server-side. Reverse via `status='active'`.
    this.http.patch<ApiVaultNoteResponse>(`${this.url}/by-seq/${prior.seq}`, { status: completed ? 'done' : 'active' })
      .subscribe({
        next: () => {
          this.activityService.post(event);
          this.toast.success(`"${prior.title}" marked ${completed ? 'complete' : 'incomplete'}`);
        },
        error: () => {
          this._items.update(items => items.map(i => i.id === id ? prior : i));
          this.toast.error(`Completion update failed — "${prior.title}" reverted`);
        },
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

    this.http.patch<ApiVaultNoteResponse>(`${this.url}/by-seq/${prior.seq}`, { grooming_status: next })
      .subscribe({
        next: () => this.activityService.post(event),
        error: () => {
          this._items.update(items => items.map(i => i.id === id ? prior : i));
          this.toast.error(`Status change failed — "${prior.title}" reverted`);
        },
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

    this.http.patch<ApiVaultNoteResponse>(`${this.url}/by-seq/${prior.seq}`, { assigned_to: toActorId })
      .subscribe({
        next: () => {
          this.activityService.post(event);
          this.toast.success(`"${prior.title}" reassigned to ${toActorId}`);
        },
        error: () => {
          this._items.update(items => items.map(i => i.id === id ? prior : i));
          this.toast.error(`Reassign failed — "${prior.title}" reverted`);
        },
      });
  }

  // Atomic reject-with-reason composition. Composes three writes:
  //   1. PATCH vault-item: grooming_status='needs_rework', assigned_to=newOwnerId
  //   2. POST thread message of kind 'rejection' with the reason
  //   3. POST RejectionEvent activity row referencing the thread message id
  // No-op when item is already in needs_rework. Throws synchronously when reason
  // is missing or below 12 chars — UI guards against this but the service is
  // the durable last line of defence.
  rejectItem(id: VaultItemId, reason: string, newOwnerId: ActorId): void {
    const trimmed = reason.trim();
    if (trimmed.length === 0) throw new Error('reason required');
    if (trimmed.length < 12) throw new Error('reason must be at least 12 chars');

    const prior = this.getById(id);
    if (!prior) return;
    if (prior.grooming_status === 'needs_rework') return; // no-op

    const fromStatus = prior.grooming_status;
    const fromOwner  = prior.assigned_to;
    const tmId       = threadMessageId(crypto.randomUUID());

    const optimistic = {
      ...prior,
      grooming_status: 'needs_rework' as const,
      assigned_to: newOwnerId,
      latest_event: {
        ts: new Date().toISOString(),
        actor_id: this.currentActorId,
        actor_display_name: null,
        action: 'rejected',
        from_value: fromStatus,
        to_value: 'needs_rework' as const,
        reason: trimmed,
      },
    };
    this._items.update(items => items.map(i => i.id === id ? optimistic : i));

    const threadEvent: EventPayload = {
      type: 'thread_message_posted',
      vault_item_id: id,
      actor_id: this.currentActorId,
      message_id: tmId,
      message_kind: 'rejection',
    };
    const rejectEvent: EventPayload = {
      type: 'rejected',
      vault_item_id: id,
      actor_id: this.currentActorId,
      from_status: fromStatus,
      to_status: 'needs_rework',
      from_owner: fromOwner,
      to_owner: newOwnerId,
      reason: trimmed,
      thread_message_id: tmId,
    };

    if (isSeedMode()) {
      this.activityService.post(threadEvent);
      this.activityService.post(rejectEvent);
      return;
    }

    this.http.patch<ApiVaultNoteResponse>(`${this.url}/by-seq/${prior.seq}`, { grooming_status: 'needs_rework', assigned_to: newOwnerId }).subscribe({
      next: () => {
        this.http.post(`${environment.dashboardApiUrl}/api/thread-messages`, {
          id: tmId,
          vault_item_id: id,
          author_actor_id: this.currentActorId,
          kind: 'rejection',
          body: trimmed,
          in_reply_to: null,
          answered_by: null,
        }).subscribe({ error: () => {} });
        this.activityService.post(threadEvent);
        this.activityService.post(rejectEvent);
        this.toast.success(`"${prior.title}" sent back for rework`);
      },
      error: (err) => {
        console.warn('[rejectItem] PATCH failed, rolling back optimistic update', err);
        this._items.update(items => items.map(i => i.id === id ? prior : i));
        this.toast.error(`Rejection failed — "${prior.title}" reverted`);
      },
    });
  }

  // Hard delete. Prefer archive() for most use cases.
  remove(id: VaultItemId): void {
    const prior = this.getById(id);
    if (!prior) return;
    this._items.update(items => items.filter(i => i.id !== id));

    if (isSeedMode()) return;

    this.http.delete(`${this.url}/by-seq/${prior.seq}`)
      .subscribe({
        next: () => this.toast.success(`"${prior.title}" deleted`),
        error: () => {
          this._items.update(items => [...items, prior]);
          this.toast.error(`Delete failed — "${prior.title}" restored`);
        },
      });
  }
}

// ── API response adaptation ────────────────────────────────────────────────
// The new /api/vault-items endpoint returns the production schema shape, which
// is wider and uses different conventions than the dashboard's VaultItem.
// Map at the boundary so consumers don't need to know about the drift.

// Production VaultNote shape returned by single-row endpoints (POST /api/vault/notes,
// PATCH /api/vault/notes/by-seq/{seq}, etc). Wider than the dashboard's VaultItem
// and shaped differently (string tags, free-text acceptance_criteria, flat
// source_kind/source_ref/source_url, no view-state embeds). Mirrors the API's
// VaultNoteSchema. Treat as opaque outside the adapter — most write paths only
// need to confirm success and read {id, seq, created_at} off the response.
interface ApiVaultNoteResponse {
  id: string;
  // Postgres returns int8 columns as strings; the API may forward either form.
  seq: number | string | null;
  title: string;
  type: string;
  category: string | null;
  status: string;
  body: string | null;
  ai_priority: number | null;
  ai_rationale: string | null;
  manual_priority: number | null;
  sort_position: number | null;
  actionability: string | null;
  source_kind: string | null;
  source_ref: string | null;
  source_url: string | null;
  tags: string | null;
  created_at: string | null;
  updated_at: string | null;
  completed_at: string | null;
  raw_frontmatter: string | null;
  assigned_to: string;
  due_at: string | null;
  blocked_by: string | null;
  parent_id: string | null;
  source_signal: string | null;
  last_nudged_at: string | null;
  nudge_count: number;
  route: string;
  agent_type: string | null;
  acceptance_criteria: string | null;
  ready: number;
  suggested_agent_type: string | null;
  suggested_parent_id: string | null;
  cited_lesson_ids: string | null;
  suggested_route: string | null;
  suggested_ac: string | null;
  grooming_status: string;
  suggested_skills: string | null;
  executor: string | null;
  is_epic: number;
  epic_started_at: string | null;
  blocked_reason: string | null;
  blocked_at: string | null;
  grooming_started_at: string | null;
  retry_count: number;
  priority_confidence: number | null;
  ai_rationale_model: string | null;
}

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
  latest_event: {
    ts: string;
    actor_id: string;
    actor_display_name: string | null;
    action: string;
    from_value: string | null;
    to_value: string | null;
    reason: string | null;
  } | null;
  latest_message: {
    created_at: string;
    author_actor_id: string;
    author_display_name: string | null;
    kind: string;
    body_excerpt: string;
  } | null;
  days_in_column: number;
}

interface ApiVaultItemsResponse {
  items: ApiVaultItem[];
  total: number;
  limit: number;
}

// Production has 16+ type values (task, idea, bookmark, travel, recipe,
// journal, health, quote, ...). The dashboard splits these onto two axes:
//   `type` is "what can be done with it" — task / bookmark / note
//   `category` is "what it's about" — production's original type when not
//                                     one of the actionability values
function splitType(t: string): { type: VaultItemType; category: VaultItemCategory | null } {
  if (t === 'task' || t === 'bookmark' || t === 'note') {
    return { type: t, category: null };
  }
  return { type: 'note', category: t };
}

// Production grooming statuses lag the dashboard: `intake_complete` and
// `needs_rework` are TS-only until backend mutations land. Any production
// value passes through; the dashboard-only members stay valid in the type.
function narrowGroomingStatus(s: string): GroomingStatus {
  const valid: readonly GroomingStatus[] = [
    'needs_rework',
    'ungroomed',
    'intake_rejected',
    'intake_complete',
    'classified',
    'decomposed',
    'ready',
  ];
  return (valid as readonly string[]).includes(s) ? s as GroomingStatus : 'ungroomed';
}

function narrowActionability(a: string | null): Actionability | null {
  return a === 'clear' || a === 'needs-breakdown' || a === 'vague' ? a : null;
}

function narrowPriority(p: number | null): Priority | null {
  return p === 0 || p === 1 || p === 2 || p === 3 ? p : null;
}

function buildSource(kind: string | null, ref: string | null, url: string | null): Source | null {
  if (!kind || !ref) return null;
  switch (kind) {
    case 'manual':    return { kind, ref, url: null };
    case 'email':     return { kind, ref, url: url ?? null };
    case 'telegram':  return { kind, ref, url: null };
    case 'agent':     return { kind, ref: actorId(ref), url: null };
    case 'url':       return { kind, ref, url: url ?? ref };
    case 'pr-comment':
      return url ? { kind, ref: ref as `${string}#${number}`, url } : null;
    case 'github':
      return url ? { kind, ref: ref as `${string}#${number}`, url } : null;
    default:
      return null;
  }
}

// ── Outbound serialization ────────────────────────────────────────────────
// API CreateNoteBody / UpdateNoteBody accept a flat shape with scalar fields.
// The dashboard's CreateVaultItemPayload / UpdateVaultItemPayload carries arrays
// (tags, acceptance_criteria) and a nested `source` object. Flatten before send;
// drop fields the API doesn't accept on the relevant endpoint.

// CreateNoteBody intentionally omits grooming_status, assigned_to, archived_at,
// completed_at — those happen via dedicated mutations or PATCH follow-ups.
function toApiCreateBody(p: CreateVaultItemPayload): Record<string, unknown> {
  const body: Record<string, unknown> = { title: p.title, type: p.type };
  if (p.body) body['body'] = p.body;
  if (p.tags?.length) body['tags'] = p.tags.join(', ');
  if (p.acceptance_criteria?.length) {
    body['acceptance_criteria'] = p.acceptance_criteria.map(ac => ac.text).join('\n');
  }
  if (p.manual_priority != null) body['manual_priority'] = p.manual_priority;
  if (p.actionability) body['actionability'] = p.actionability;
  if (p.parent_id) body['parent_id'] = p.parent_id;
  if (p.due_at) body['due_at'] = p.due_at;
  if (p.source) {
    body['source_kind'] = p.source.kind;
    body['source_ref']  = p.source.ref;
    if ('url' in p.source && p.source.url) body['source_url'] = p.source.url;
  }
  return body;
}

// Fields CreateNoteBody doesn't accept but we still want to set on create —
// applied via a PATCH follow-up after the row exists.
function createFollowUpPatch(p: CreateVaultItemPayload): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if (p.grooming_status && p.grooming_status !== 'ungroomed') patch['grooming_status'] = p.grooming_status;
  if (p.assigned_to) patch['assigned_to'] = p.assigned_to;
  return patch;
}

// UpdateNoteBody is wider than CreateNoteBody (accepts grooming_status, ai_*,
// completed_at-via-dedicated-mutation, etc). Flatten the same way; pass through
// scalars. Callers must NOT use this for `archived_at` — production uses
// status='archived' instead, owned by archive()/unarchive().
function toApiUpdateBody(p: UpdateVaultItemPayload): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (p.title !== undefined) body['title'] = p.title;
  if (p.body !== undefined) body['body'] = p.body;
  if (p.tags !== undefined) body['tags'] = p.tags.join(', ');
  if (p.acceptance_criteria !== undefined) {
    body['acceptance_criteria'] = p.acceptance_criteria.map(ac => ac.text).join('\n');
  }
  if (p.manual_priority !== undefined) body['manual_priority'] = p.manual_priority;
  if (p.ai_priority !== undefined) body['ai_priority'] = p.ai_priority;
  if (p.ai_rationale !== undefined) body['ai_rationale'] = p.ai_rationale;
  if (p.priority_confidence !== undefined) body['priority_confidence'] = p.priority_confidence;
  if (p.actionability !== undefined) body['actionability'] = p.actionability;
  if (p.assigned_to !== undefined) body['assigned_to'] = p.assigned_to;
  if (p.parent_id !== undefined) body['parent_id'] = p.parent_id;
  if (p.due_at !== undefined) body['due_at'] = p.due_at;
  if (p.completed_at !== undefined) body['completed_at'] = p.completed_at;
  if (p.grooming_status !== undefined) body['grooming_status'] = p.grooming_status;
  if (p.source !== undefined) {
    if (p.source === null) {
      body['source_kind'] = null;
      body['source_ref']  = null;
      body['source_url']  = null;
    } else {
      body['source_kind'] = p.source.kind;
      body['source_ref']  = p.source.ref;
      body['source_url']  = 'url' in p.source ? p.source.url : null;
    }
  }
  return body;
}

function toVaultItem(a: ApiVaultItem): VaultItem {
  const { type, category } = splitType(a.type);
  return {
    id: vaultItemId(a.id),
    // Postgres returns int8/numeric as strings; the dashboard treats `seq` as a number
    // (URL `?detail=<seq>` lookups, optimistic-create reconciliation use strict equality).
    seq: Number(a.seq),
    title: a.title,
    body: a.body ?? '',
    type,
    category,
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
    source: buildSource(a.source_kind, a.source_ref, a.source_url),
    created_at: a.created_at,

    // View-state embeds — board reads these instead of calling parallel services.
    primary_project_id:   a.primary_project_id,
    primary_project_name: a.primary_project_name,
    open_questions_count: a.open_questions_count,
    latest_activity_at:   a.latest_activity_at,
    children_count:       a.children_count,
    latest_event:         a.latest_event,
    latest_message:       a.latest_message,
    days_in_column:       a.days_in_column,
  };
}
