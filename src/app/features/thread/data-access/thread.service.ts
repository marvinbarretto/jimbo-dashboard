// NOTE: The /thread-messages endpoint does not yet exist in jimbo-api (Hono + SQLite on VPS).
// This service scaffolds the pattern so the frontend is ready when the backend catches up.
//
// Messages are always scoped to a vault_item_id — there's no global thread query.
// Consumers call loadFor(id) explicitly; this service never auto-fetches in its constructor.

import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import type { ThreadMessage, CreateThreadMessagePayload, MarkAnsweredPayload } from '../../../domain/thread';
import type { VaultItemId, ThreadMessageId } from '../../../domain/ids';
import { environment } from '../../../../environments/environment';
import { isSeedMode } from '../../../shared/seed-mode';
import { SEED } from '../../../domain/seed';

@Injectable({ providedIn: 'root' })
export class ThreadService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/thread-messages`;

  // Keyed by vault_item_id string. Lazy-populated via loadFor().
  private readonly _messagesByItem = signal<Record<string, ThreadMessage[]>>({});

  // Reactive getter — returns a computed scoped to this vault item.
  // Callers must invoke inside their own computed() so the vaultItemId input drives reactivity.
  messagesFor(vaultItemId: VaultItemId) {
    return computed(() => this._messagesByItem()[vaultItemId] ?? []);
  }

  // Only unresolved questions — these populate the "in reply to" dropdown and the readiness check.
  openQuestionsFor(vaultItemId: VaultItemId) {
    return computed(() =>
      (this._messagesByItem()[vaultItemId] ?? []).filter(
        m => m.kind === 'question' && m.answered_by === null
      )
    );
  }

  loadFor(vaultItemId: VaultItemId): void {
    if (isSeedMode()) {
      const data = SEED.thread_messages.filter(m => m.vault_item_id === vaultItemId);
      this._messagesByItem.update(map => ({ ...map, [vaultItemId]: [...data] }));
      return;
    }
    const params = new HttpParams().set('vault_item_id', `eq.${vaultItemId}`).set('order', 'created_at');
    this.http.get<ThreadMessage[]>(this.url, { params }).subscribe({
      next: data => this._messagesByItem.update(map => ({ ...map, [vaultItemId]: data })),
      // Silently swallow errors — endpoint doesn't exist yet; empty state is correct fallback.
      error: () => this._messagesByItem.update(map => ({ ...map, [vaultItemId]: [] })),
    });
  }

  post(payload: CreateThreadMessagePayload): void {
    const optimistic: ThreadMessage = { ...payload, created_at: new Date().toISOString() };
    const id = payload.vault_item_id;

    // Optimistic insert — append the new message immediately.
    this._messagesByItem.update(map => ({
      ...map,
      [id]: [...(map[id] ?? []), optimistic],
    }));

    // Dual-write: if this is an answer replying to a question, flip the question's answered_by
    // on the client now. The server does this atomically; we mirror it optimistically.
    if (payload.kind === 'answer' && payload.in_reply_to) {
      const questionId = payload.in_reply_to;
      this._applyAnsweredBy(id, questionId, payload.id);
    }

    if (isSeedMode()) return;

    this.http
      .post<ThreadMessage[]>(this.url, payload, { headers: { Prefer: 'return=representation' } })
      .subscribe({
        next: ([created]) => {
          // Replace optimistic row with the server-confirmed row.
          this._messagesByItem.update(map => ({
            ...map,
            [id]: (map[id] ?? []).map(m => m.id === payload.id ? created : m),
          }));
        },
        error: () => {
          // Roll back: remove the optimistic message and undo the question mutation.
          this._messagesByItem.update(map => ({
            ...map,
            [id]: (map[id] ?? []).filter(m => m.id !== payload.id),
          }));
          if (payload.kind === 'answer' && payload.in_reply_to) {
            this._applyAnsweredBy(id, payload.in_reply_to, null);
          }
        },
      });
  }

  markAnswered(questionId: ThreadMessageId, answerId: ThreadMessageId): void {
    // Apply optimistic update locally first so seed mode + offline both work.
    const buckets = this._messagesByItem();
    const entry = Object.entries(buckets).find(([, msgs]) => msgs.some(m => m.id === questionId));
    if (!entry) return;
    const [vaultItemId] = entry;
    this._applyAnsweredBy(vaultItemId as VaultItemId, questionId, answerId);

    if (isSeedMode()) return;

    const patch: MarkAnsweredPayload = { answered_by: answerId };
    const params = new HttpParams().set('id', `eq.${questionId}`);
    this.http
      .patch<ThreadMessage[]>(this.url, patch, { params, headers: { Prefer: 'return=representation' } })
      .subscribe({
        next: ([updated]) => {
          this._messagesByItem.update(map => ({
            ...map,
            [vaultItemId]: map[vaultItemId].map(m => m.id === questionId ? updated : m),
          }));
        },
      });
  }

  // Internal: mutate answered_by on the question message inside a given bucket.
  private _applyAnsweredBy(
    vaultItemId: VaultItemId,
    questionId: ThreadMessageId,
    answerId: ThreadMessageId | null,
  ): void {
    this._messagesByItem.update(map => ({
      ...map,
      [vaultItemId]: (map[vaultItemId] ?? []).map(m =>
        m.id === questionId ? { ...m, answered_by: answerId } : m
      ),
    }));
  }
}
