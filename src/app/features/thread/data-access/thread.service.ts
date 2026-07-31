// Thread comments/questions/corrections via dashboard-api at
// /api/thread-messages (jimbo_pg `thread_messages` table). Phase 3 part 3
// of Phase C — replaces legacy PostgREST scaffold.

import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import type { ThreadMessage, CreateThreadMessagePayload, MarkAnsweredPayload } from '@domain/thread';
import { pendingRepliesFor } from '@domain/thread';
import type { ActorId, VaultItemId, ThreadMessageId } from '@domain/ids';
import { environment } from '../../../../environments/environment';
import { ToastService } from '@shared/components/toast/toast.service';
import { isSeedMode } from '@shared/seed-mode';
import { SEED } from '@domain/seed';

@Injectable({ providedIn: 'root' })
export class ThreadService {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly url = `${environment.dashboardApiUrl}/api/thread-messages`;

  private readonly _messagesByItem = signal<Record<string, ThreadMessage[]>>({});

  // Bumped once the server has accepted a post. Posting has server-side
  // side-effects beyond the thread — a note_activity row, and possibly a
  // reassignment when an answer clears the last open question — so the
  // Activity panel and the item header both go stale on every post. Consumers
  // watch this to know when to re-pull. A counter rather than a flag so two
  // posts in a row each trigger.
  private readonly _postedByItem = signal<Record<string, number>>({});

  /**
   * How many posts for `vaultItemId` the server has accepted this session.
   * Reads the backing signal, so calling it inside an `effect` subscribes to it.
   */
  postedCount(vaultItemId: VaultItemId): number {
    return this._postedByItem()[vaultItemId] ?? 0;
  }

  private bumpPosted(id: VaultItemId): void {
    this._postedByItem.update(map => ({ ...map, [id]: (map[id] ?? 0) + 1 }));
  }

  messagesFor(vaultItemId: VaultItemId) {
    return computed(() => this._messagesByItem()[vaultItemId] ?? []);
  }

  openQuestionsFor(vaultItemId: VaultItemId) {
    return computed(() =>
      (this._messagesByItem()[vaultItemId] ?? []).filter(
        m => m.kind === 'question' && m.answered_by === null
      )
    );
  }

  /** Messages sitting after `viewer`'s last word, from someone else — see
   *  `pendingRepliesFor`. Attention signal, NOT a readiness gate. */
  pendingRepliesFor(vaultItemId: VaultItemId, viewer: ActorId) {
    return computed(() => pendingRepliesFor(this._messagesByItem()[vaultItemId] ?? [], viewer));
  }

  loadFor(vaultItemId: VaultItemId): void {
    if (isSeedMode()) {
      const data = SEED.thread_messages.filter(m => m.vault_item_id === vaultItemId);
      this._messagesByItem.update(map => ({ ...map, [vaultItemId]: [...data] }));
      return;
    }
    const params = new HttpParams().set('vault_item_id', vaultItemId);
    this.http.get<{ items: ThreadMessage[] }>(this.url, { params }).subscribe({
      next: ({ items }) => this._messagesByItem.update(map => ({ ...map, [vaultItemId]: items })),
      error: () => this._messagesByItem.update(map => ({ ...map, [vaultItemId]: [] })),
    });
  }

  post(payload: CreateThreadMessagePayload): void {
    const optimistic: ThreadMessage = { ...payload, created_at: new Date().toISOString() };
    const id = payload.vault_item_id;

    this._messagesByItem.update(map => ({ ...map, [id]: [...(map[id] ?? []), optimistic] }));

    if (payload.kind === 'answer' && payload.in_reply_to) {
      this._applyAnsweredBy(id, payload.in_reply_to, payload.id);
    }

    if (isSeedMode()) return;

    this.http.post<ThreadMessage>(this.url, payload).subscribe({
      next: created => {
        this._messagesByItem.update(map => ({
          ...map,
          [id]: (map[id] ?? []).map(m => m.id === payload.id ? created : m),
        }));
        this.bumpPosted(id);
      },
      error: () => {
        this._messagesByItem.update(map => ({
          ...map,
          [id]: (map[id] ?? []).filter(m => m.id !== payload.id),
        }));
        if (payload.kind === 'answer' && payload.in_reply_to) {
          this._applyAnsweredBy(id, payload.in_reply_to, null);
        }
        this.toast.error('Message failed to send — removed');
      },
    });
  }

  markAnswered(questionId: ThreadMessageId, answerId: ThreadMessageId): void {
    const buckets = this._messagesByItem();
    const entry = Object.entries(buckets).find(([, msgs]) => msgs.some(m => m.id === questionId));
    if (!entry) return;
    const [vaultItemId] = entry;
    this._applyAnsweredBy(vaultItemId as VaultItemId, questionId, answerId);

    if (isSeedMode()) return;

    const patch: MarkAnsweredPayload = { answered_by: answerId };
    this.http.patch<ThreadMessage>(`${this.url}/${encodeURIComponent(questionId)}`, patch)
      .subscribe({
        next: updated => {
          this._messagesByItem.update(map => ({
            ...map,
            [vaultItemId]: map[vaultItemId].map(m => m.id === questionId ? updated : m),
          }));
          // Same server-side side-effects as a posted answer — resolving the
          // last open question can reassign the item.
          this.bumpPosted(vaultItemId as VaultItemId);
        },
        error: () => this.toast.error('Failed to mark question answered'),
      });
  }

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
