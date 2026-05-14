// Reads from jimbo-api /api/vault/board (board-shaped enriched query).
// Mutations go to /api/vault/notes (by-seq variants). Seed mode is preserved
// for offline UI work.

import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { VaultItem, CreateVaultItemPayload, UpdateVaultItemPayload, GroomingStatus, VaultItemType, VaultItemCategory, Priority, Actionability } from '@domain/vault/vault-item';
import { isActive } from '@domain/vault/vault-item';
import type { Source, ManualSource, GitHubSource } from '@domain/vault/source';
import type { ActorId, VaultItemId } from '@domain/ids';
import type { VaultActivityEvent } from '@domain/activity/activity-event';
import { vaultItemId, actorId, threadMessageId } from '@domain/ids';
import { CURRENT_ACTOR_ID } from '@domain/actors';
import { ApiVaultItemsResponseSchema, type ApiVaultItem } from '@domain/vault/vault-item.api-schema';
import { environment } from '../../../../environments/environment';
import { ActivityEventsService } from './activity-events.service';
import { VaultItemProjectsService } from './vault-item-projects.service';
import { ToastService } from '@shared/components/toast/toast.service';
import {
  withOptimisticUpdate,
  withOptimisticCreate,
  withOptimisticRemove,
} from '@shared/data-access/with-optimistic';
import { isSeedMode } from '@shared/seed-mode';
import { SEED } from '@domain/seed';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import type { DraftPayload } from '../dialog/vault-item-dialog-mode';

// Convenience alias — the union parameter type for post(). Vault-side only.
// Distributive Omit so each variant loses id/at independently.
type CreatePayload<T> = T extends unknown ? Omit<T, 'id' | 'at'> : never;
type EventPayload = CreatePayload<VaultActivityEvent>;

@Injectable({ providedIn: 'root' })
export class VaultItemsService {
  private readonly http = inject(HttpClient);
  private readonly activityService = inject(ActivityEventsService);
  private readonly projectsJunction = inject(VaultItemProjectsService);
  private readonly toast = inject(ToastService);
  private readonly url = `${environment.dashboardApiUrl}/api/vault/notes`;

  private readonly _items = signal<VaultItem[]>([]);
  private readonly _loading = signal(true);

  readonly items = this._items.asReadonly();
  readonly activeItems = computed(() => this._items().filter(isActive));
  readonly isLoading = this._loading.asReadonly();

  private readonly currentActorId: ActorId = CURRENT_ACTOR_ID;

  constructor() { this.load(); }

  private load(): void {
    if (isSeedMode()) {
      this._items.set([...SEED.vault_items]);
      this._loading.set(false);
      return;
    }
    this.http.get<unknown>(`${environment.dashboardApiUrl}/api/vault/board?limit=2000`).subscribe({
      next: (raw) => {
        const result = ApiVaultItemsResponseSchema.safeParse(raw);
        if (!result.success) {
          console.error('[vault-items] /api/vault/board response failed schema:', result.error.issues);
          this.toast.error('Failed to load vault items — API response did not match expected shape');
          this._loading.set(false);
          return;
        }
        this._items.set(result.data.items.map(toVaultItem));
        this._loading.set(false);
      },
      error: () => {
        this.toast.error('Failed to load vault items — network or server error');
        this._loading.set(false);
      },
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
      actionability: null, parent_id: null, is_epic: false,
      archived_at: null, due_at: null, completed_at: null,
      source: { kind: 'manual', ref: 'board', url: null },
      created_at: now,
      primary_project_id: null, primary_project_name: null,
      open_questions_count: 0, latest_activity_at: null,
      children_count: 0, latest_event: null, latest_message: null,
      days_in_column: 0,
    };

    if (isSeedMode()) {
      this._items.update(items => [optimistic, ...items]);
      return;
    }

    // source_kind/source_ref tag the row as operator-created so the execution
    // board's manual-track filter (`source.kind === 'manual'`) survives reload.
    const body: Record<string, unknown> = {
      title: trimmed,
      type,
      source_kind: 'manual',
      source_ref: 'board',
    };
    if (input.manual_priority != null) body['manual_priority'] = input.manual_priority;

    withOptimisticCreate(this._items, this.toast, {
      optimistic,
      // Default 'prepend' — board capture inputs add fresh items at the top.
      request: this.http.post<ApiVaultNoteResponse>(this.url, body),
      realFromResponse: (note) => ({ ...optimistic, id: vaultItemId(note.id), seq: Number(note.seq) }),
      errorMessage: `Failed to create "${trimmed}"`,
      onSuccess: (real) => {
        this.toast.success(`"${trimmed}" created · #${real.seq}`);
        // Caller (typically a board) gets the real seq so it can deep-link
        // straight into the detail dialog for in-place editing.
        onCreated?.(real);

        // CreateNoteBody doesn't accept grooming_status or assigned_to overrides
        // for board-driven flows — the server defaults to ungroomed/jimbo. PATCH
        // any drift in a follow-up so the UI sees what we asked for.
        const patch: Record<string, unknown> = {};
        if (groomingStatus !== 'ungroomed') patch['grooming_status'] = groomingStatus;
        // Server sets assigned_to from session; we asked for currentActorId. If
        // they differ, push the override.
        const realRow = this.getById(real.id);
        if (realRow?.assigned_to !== this.currentActorId) patch['assigned_to'] = this.currentActorId;
        if (Object.keys(patch).length === 0) return;
        this.http.patch<ApiVaultNoteResponse>(`${this.url}/by-seq/${real.seq}`, patch).subscribe({
          next: () => this._items.update(items => items.map(i => i.id === real.id
            ? { ...i, grooming_status: groomingStatus, assigned_to: this.currentActorId }
            : i)),
          error: () => this.toast.error('Created but status/owner follow-up failed'),
        });
      },
    });
  }

  // Optimistic create from the full vault-item-form. `created` event emits
  // after the server confirms — we need the real vault_item_id, so we can't
  // emit against the temp id. Appended (not prepended) so the form-driven
  // flow's downstream consumers see items in arrival order.
  create(payload: CreateVaultItemPayload): void {
    const now = new Date().toISOString();
    const tempId = vaultItemId(crypto.randomUUID());
    const optimistic: VaultItem = { ...payload, id: tempId, seq: -1, archived_at: null, created_at: now };

    if (isSeedMode()) {
      // No server to assign a real seq — keep the temp row, emit the event.
      this._items.update(items => [...items, optimistic]);
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

    withOptimisticCreate(this._items, this.toast, {
      optimistic,
      position: 'append',
      request: this.http.post<ApiVaultNoteResponse>(this.url, body),
      // Keep the optimistic shape (already correct) and splice in only the
      // server-managed fields. The raw API response is the production VaultNote
      // shape (string tags, null AC, no embeds) — replacing wholesale would
      // corrupt the row until the next board reload.
      realFromResponse: (created) => ({
        ...optimistic,
        id: vaultItemId(created.id),
        seq: Number(created.seq),
        created_at: created.created_at ?? now,
      }),
      errorMessage: `Failed to create "${payload.title}"`,
      onSuccess: (real) => {
        this.activityService.post({
          type: 'created',
          vault_item_id: real.id,
          actor_id: this.currentActorId,
        });
        // Apply fields the create endpoint doesn't accept (grooming_status,
        // assigned_to overrides) as a follow-up PATCH, so the server state
        // matches what the form asked for.
        const followUp = createFollowUpPatch(payload);
        if (Object.keys(followUp).length > 0) {
          this.http.patch<ApiVaultNoteResponse>(`${this.url}/by-seq/${real.seq}`, followUp).subscribe({
            error: () => this.toast.error('Created but follow-up update failed'),
          });
        }
        this.toast.success(`"${payload.title}" created`);
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

    // Trust the optimistic shape on success — the API response is the wider
    // production VaultNote (different shape from VaultItem); replacing it
    // wholesale would corrupt the row. So onSuccess is intentionally empty.
    withOptimisticUpdate(this._items, this.toast, {
      prior,
      next: optimistic,
      request: this.http.patch<ApiVaultNoteResponse>(
        `${this.url}/by-seq/${prior.seq}`,
        toApiUpdateBody(patch),
      ),
      errorMessage: 'Update failed — changes reverted',
      seedMode: isSeedMode(),
    });
  }

  // Sets archived_at and emits an `archived` event. Mirror method `unarchive` clears it.
  archive(id: VaultItemId, note: string | null = null): void {
    const prior = this.getById(id);
    if (!prior || prior.archived_at !== null) return;
    const now = new Date().toISOString();
    const optimistic = { ...prior, archived_at: now };
    const event: EventPayload = {
      type: 'archived',
      vault_item_id: id,
      actor_id: this.currentActorId,
      archived_at: now,
      note,
    };

    // API doesn't accept `archived_at` — production uses `status='archived'`.
    // The dashboard keeps the derived `archived_at` locally for lifecycle helpers.
    withOptimisticUpdate(this._items, this.toast, {
      prior,
      next: optimistic,
      request: this.http.patch<ApiVaultNoteResponse>(
        `${this.url}/by-seq/${prior.seq}`,
        { status: 'archived' },
      ),
      errorMessage: `Archive failed — "${prior.title}" reverted`,
      seedMode: isSeedMode(),
      onSuccess: () => {
        this.activityService.post(event);
        this.toast.success(`Archived #${prior.seq} · "${prior.title}"`);
      },
    });
  }

  unarchive(id: VaultItemId, note: string | null = null): void {
    const prior = this.getById(id);
    if (!prior || prior.archived_at === null) return;
    const optimistic = { ...prior, archived_at: null };
    const event: EventPayload = {
      type: 'unarchived',
      vault_item_id: id,
      actor_id: this.currentActorId,
      note,
    };

    // Mirror of archive() — API uses `status` not `archived_at`.
    withOptimisticUpdate(this._items, this.toast, {
      prior,
      next: optimistic,
      request: this.http.patch<ApiVaultNoteResponse>(
        `${this.url}/by-seq/${prior.seq}`,
        { status: 'active' },
      ),
      errorMessage: `Restore failed — "${prior.title}" reverted`,
      seedMode: isSeedMode(),
      onSuccess: () => {
        this.activityService.post(event);
        this.toast.success(`"${prior.title}" restored`);
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
    const optimistic = { ...prior, completed_at: to };
    const event: EventPayload = {
      type: 'completion_changed',
      vault_item_id: id,
      actor_id: this.currentActorId,
      from,
      to,
      note,
    };

    // API doesn't accept `completed_at` directly — write `status='done'` and the
    // server stamps completed_at server-side. Reverse via `status='active'`.
    withOptimisticUpdate(this._items, this.toast, {
      prior,
      next: optimistic,
      request: this.http.patch<ApiVaultNoteResponse>(
        `${this.url}/by-seq/${prior.seq}`,
        { status: completed ? 'done' : 'active' },
      ),
      errorMessage: `Completion update failed — "${prior.title}" reverted`,
      seedMode: isSeedMode(),
      onSuccess: () => {
        this.activityService.post(event);
        this.toast.success(`"${prior.title}" marked ${completed ? 'complete' : 'incomplete'}`);
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
    const optimistic = { ...prior, grooming_status: next };
    const event: EventPayload = {
      type: 'grooming_status_changed',
      vault_item_id: id,
      actor_id: this.currentActorId,
      from,
      to: next,
      note,
    };

    // No success toast on this path — drag-drop fires it on every column move
    // and the operator already sees the card snap. Audit event is the durable
    // signal; toast on failure only.
    withOptimisticUpdate(this._items, this.toast, {
      prior,
      next: optimistic,
      request: this.http.patch<ApiVaultNoteResponse>(
        `${this.url}/by-seq/${prior.seq}`,
        { grooming_status: next },
      ),
      errorMessage: `Status change failed — "${prior.title}" reverted`,
      seedMode: isSeedMode(),
      onSuccess: () => this.activityService.post(event),
    });
  }

  // Patches assigned_to; emits assigned event with prior actor captured before the patch.
  reassign(id: VaultItemId, toActorId: ActorId, reason: string | null): void {
    const prior = this.getById(id);
    if (!prior) return;
    const fromActorId = prior.assigned_to;
    const optimistic = { ...prior, assigned_to: toActorId };
    const event: EventPayload = {
      type: 'assigned',
      vault_item_id: id,
      actor_id: this.currentActorId,
      from_actor_id: fromActorId,
      to_actor_id: toActorId,
      reason,
    };

    withOptimisticUpdate(this._items, this.toast, {
      prior,
      next: optimistic,
      request: this.http.patch<ApiVaultNoteResponse>(
        `${this.url}/by-seq/${prior.seq}`,
        { assigned_to: toActorId },
      ),
      errorMessage: `Reassign failed — "${prior.title}" reverted`,
      seedMode: isSeedMode(),
      onSuccess: () => {
        this.activityService.post(event);
        this.toast.success(`"${prior.title}" reassigned to ${toActorId}`);
      },
    });
  }

  setEpic(id: VaultItemId, next: boolean): void {
    const prior = this.getById(id);
    if (!prior || prior.is_epic === next) return;
    const optimistic = { ...prior, is_epic: next };

    withOptimisticUpdate(this._items, this.toast, {
      prior,
      next: optimistic,
      request: this.http.patch<ApiVaultNoteResponse>(
        `${this.url}/by-seq/${prior.seq}`,
        { is_epic: next },
      ),
      errorMessage: `Epic toggle failed — "${prior.title}" reverted`,
      seedMode: isSeedMode(),
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
      this._items.update(items => items.map(i => i.id === id ? optimistic : i));
      this.activityService.post(threadEvent);
      this.activityService.post(rejectEvent);
      return;
    }

    // The PATCH is the source of truth — its success/failure drives optimistic
    // commit/rollback via the helper. Inside onSuccess we fire the thread
    // message POST as a fire-and-forget follow-up: if it fails, the rejection
    // still stands but the explanation is missing — log only, no toast, no
    // rollback (the primary action did persist).
    withOptimisticUpdate(this._items, this.toast, {
      prior,
      next: optimistic,
      request: this.http.patch<ApiVaultNoteResponse>(
        `${this.url}/by-seq/${prior.seq}`,
        { grooming_status: 'needs_rework', assigned_to: newOwnerId },
      ),
      errorMessage: `Rejection failed — "${prior.title}" reverted`,
      onSuccess: () => {
        this.http.post(`${environment.dashboardApiUrl}/api/thread-messages`, {
          id: tmId,
          vault_item_id: id,
          author_actor_id: this.currentActorId,
          kind: 'rejection',
          body: trimmed,
          in_reply_to: null,
          answered_by: null,
        }).subscribe({
          error: (err) => console.error('[vault] rejection thread message failed:', err),
        });
        this.activityService.post(threadEvent);
        this.activityService.post(rejectEvent);
        this.toast.success(`"${prior.title}" sent back for rework`);
      },
    });
  }

  /**
   * Create a vault item from the unified dialog's Draft payload, then attach
   * project junctions for any selected projects. Returns an Observable that
   * emits the created VaultItem.
   *
   * Why a separate method: the dialog wants the new item back (to morph
   * Draft → Item mode) AND wants project junctions wired in the same gesture.
   * `create()` doesn't take projects; `createOnBoard()` doesn't take body /
   * tags / assignee / related links. This is the unified-dialog shape.
   *
   * NOT optimistic. Unlike create() and createOnBoard(), this method waits
   * for the POST to confirm before adding the row to the store. The
   * dialog form is complex enough that a server-side validation failure
   * after an optimistic insert would create a confusing flash-and-revert.
   * `withOptimisticCreate` therefore doesn't fit; the helper is for
   * optimistic mutations and this is deliberately not one.
   *
   * Partial-failure policy: the note POST is the source of truth. If it
   * succeeds we resolve with the new item even if a project junction POST
   * fails — `VaultItemProjectsService.add()` rolls back its own optimistic
   * state and toasts the failure, so the dialog can stay open in Item mode
   * and the operator can retry the missing junction inline.
   */
  createWithRelations(draft: DraftPayload, opts?: { destination?: 'manual' }): Observable<VaultItem> {
    const body = toApiCreateBodyFromDraft(draft, this.currentActorId, opts);

    return this.http.post<ApiVaultNoteResponse>(this.url, body).pipe(
      map((res) => this.materialiseFromDraft(draft, res, opts)),
      tap((item) => {
        this._items.update(items => [item, ...items]);
        this.activityService.post({
          type: 'created',
          vault_item_id: item.id,
          actor_id: this.currentActorId,
        });
        for (const project of dedupeById(draft.projects)) {
          this.projectsJunction.add(item.id, project.id);
        }
        // Follow-up PATCH: API create endpoint doesn't accept is_epic or
        // grooming_status directly — mirror createOnBoard's deferred-patch pattern.
        const followUp: Record<string, unknown> = {};
        if (draft.is_epic) followUp['is_epic'] = true;
        if (opts?.destination === 'manual') followUp['grooming_status'] = 'ready';
        if (Object.keys(followUp).length) {
          this.http.patch<ApiVaultNoteResponse>(`${this.url}/by-seq/${item.seq}`, followUp).subscribe();
        }
        this.toast.success(`"${item.title}" created · #${item.seq}`);
      }),
    );
  }

  /** Build an in-memory VaultItem from a Draft + the API's notes-POST response. */
  private materialiseFromDraft(
    draft: DraftPayload,
    res: ApiVaultNoteResponse,
    opts?: { destination?: 'manual' },
  ): VaultItem {
    const realSeq = typeof res.seq === 'string' ? Number(res.seq) : (res.seq ?? -1);
    const isManual = opts?.destination === 'manual';
    const source = buildSourceFromDraft(draft, isManual);
    return {
      id: vaultItemId(res.id),
      seq: realSeq,
      title: draft.title.trim(),
      body: draft.body.trim(),
      type: 'task',
      category: null,
      assigned_to: draft.assignee?.id ?? this.currentActorId,
      tags: dedupeStrings(draft.tags),
      acceptance_criteria: [],
      grooming_status: isManual ? 'ready' : 'ungroomed',
      ai_priority: null,
      manual_priority: null,
      ai_rationale: null,
      priority_confidence: null,
      actionability: null,
      parent_id: null,
      is_epic: draft.is_epic,
      archived_at: null,
      due_at: null,
      completed_at: null,
      source,
      created_at: res.created_at ?? new Date().toISOString(),
      // Board-shape derived fields. Junction service refines primary_project_*
      // once its add() resolves; the rest stay zero/null until next bulk load.
      primary_project_id: null,
      primary_project_name: null,
      open_questions_count: 0,
      latest_activity_at: null,
      children_count: 0,
      latest_event: null,
      latest_message: null,
      days_in_column: 0,
    };
  }

  // Hard delete. Prefer archive() for most use cases.
  remove(id: VaultItemId): void {
    const prior = this.getById(id);
    if (!prior) return;

    withOptimisticRemove(this._items, this.toast, {
      prior,
      request: this.http.delete(`${this.url}/by-seq/${prior.seq}`),
      errorMessage: `Delete failed — "${prior.title}" restored`,
      seedMode: isSeedMode(),
      onSuccess: () => this.toast.success(`Deleted #${prior.seq} · "${prior.title}"`),
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

// ApiVaultItem (list shape) is now defined as a Zod schema in
// @domain/vault/vault-item.api-schema. The single-note shape returned by
// POST/PATCH endpoints is the wider ApiVaultNoteResponse below — TODO:
// migrate that to a schema too in a follow-up pass.

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

// Extracts `owner/repo#N` from a GitHub issue URL, satisfying GitHubSource.ref's
// template literal constraint. Falls back to a best-effort string if the URL
// doesn't match the expected pattern (shouldn't happen with the UI validator).
function parseGithubRef(url: string): `${string}#${number}` {
  const m = url.match(/github\.com\/([^/]+\/[^/]+)\/issues\/(\d+)/);
  if (m) return `${m[1]}#${Number(m[2])}` as `${string}#${number}`;
  // Fallback: treat url itself as ref (won't be type-safe, but beats crashing)
  return url as `${string}#${number}`;
}

// Derives the VaultItem source from a DraftPayload.
function buildSourceFromDraft(draft: DraftPayload, isManual: boolean): ManualSource | GitHubSource {
  if (draft.github_url) {
    const githubSource: GitHubSource = {
      kind: 'github',
      ref: parseGithubRef(draft.github_url),
      url: draft.github_url,
    };
    return githubSource;
  }
  const manualSource: ManualSource = { kind: 'manual', ref: isManual ? 'board' : 'dialog', url: null };
  return manualSource;
}

// Build the CreateNoteBody for the unified-dialog DraftPayload. Mirrors the
// shape the old CaptureDialog posted: comma-joined tags, `assigned_to` only
// when set, and `links` as { target_type: 'vault_note', target_id }[].
function toApiCreateBodyFromDraft(
  draft: DraftPayload,
  currentActor: ActorId,
  opts?: { destination?: 'manual' },
): Record<string, unknown> {
  const isManual = opts?.destination === 'manual';
  const body: Record<string, unknown> = {
    title: draft.title.trim(),
    type: 'task',
    source_kind: draft.github_url ? 'github' : 'manual',
    source_ref: draft.github_url
      ? parseGithubRef(draft.github_url)
      : (isManual ? 'board' : 'dialog'),
  };
  if (draft.github_url) body['source_url'] = draft.github_url;

  const trimmedBody = draft.body.trim();
  if (trimmedBody) body['body'] = trimmedBody;

  const tags = dedupeStrings(draft.tags);
  if (tags.length) body['tags'] = tags.join(', ');

  const assignee = draft.assignee?.id ?? currentActor;
  body['assigned_to'] = assignee;

  const related = dedupeRelated(draft.related);
  if (related.length) {
    body['links'] = related.map(r => ({ target_type: 'vault_note' as const, target_id: r.id }));
  }
  return body;
}

function dedupeStrings(xs: readonly string[]): string[] {
  return Array.from(new Set(xs));
}

function dedupeById<T extends { id: string }>(xs: readonly T[]): T[] {
  return Array.from(new Map(xs.map(x => [x.id as string, x])).values());
}

function dedupeRelated(xs: readonly { id: string }[]): { id: string }[] {
  return Array.from(new Map(xs.map(x => [x.id, x])).values());
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
  if (p.type !== undefined) body['type'] = p.type;
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
  if (p.is_epic !== undefined) body['is_epic'] = p.is_epic;
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
    // Production stores acceptance_criteria as free text. Round-trip with the
    // outbound serializer (toApiUpdateBody) which joins with '\n' — split here
    // so multi-criterion edits survive reload. `done` state is still lost
    // until the API gains structured AC.
    acceptance_criteria: a.acceptance_criteria
      ? a.acceptance_criteria
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0)
          .map(text => ({ text, done: false }))
      : [],
    grooming_status: narrowGroomingStatus(a.grooming_status),
    ai_priority: narrowPriority(a.ai_priority),
    manual_priority: narrowPriority(a.manual_priority),
    ai_rationale: a.ai_rationale,
    priority_confidence: a.priority_confidence,
    actionability: narrowActionability(a.actionability),
    parent_id: a.parent_id ? vaultItemId(a.parent_id) : null,
    is_epic: a.is_epic,
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
