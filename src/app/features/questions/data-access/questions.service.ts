import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import type { OpenQuestionView } from '@domain/thread';
import type { ActorId, ThreadMessageId } from '@domain/ids';
import { environment } from '../../../../environments/environment';
import { ToastService } from '@shared/components/toast/toast.service';
import { isSeedMode } from '@shared/seed-mode';
import { SEED } from '@domain/seed';
import { VaultItemsService } from '@features/vault-items/data-access/vault-items.service';

@Injectable({ providedIn: 'root' })
export class QuestionsService {
  private readonly http = inject(HttpClient);
  private readonly toast = inject(ToastService);
  private readonly vaultItemsService = inject(VaultItemsService);
  private readonly url = `${environment.dashboardApiUrl}/api/thread-messages/open-questions`;

  private readonly _questions = signal<OpenQuestionView[]>([]);
  readonly loading = signal(false);

  // Optimistic: filters out questions that were answered in this session
  readonly openQuestions = computed(() => this._questions().filter(q => q.answered_by === null));

  load(assignedTo?: ActorId): void {
    if (isSeedMode()) {
      this._loadFromSeed(assignedTo);
      return;
    }
    this.loading.set(true);
    const params = assignedTo
      ? new HttpParams().set('assigned_to', assignedTo)
      : new HttpParams();
    this.http.get<{ items: OpenQuestionView[] }>(this.url, { params }).subscribe({
      next: ({ items }) => { this._questions.set(items); this.loading.set(false); },
      error: () => { this.toast.error('Failed to load questions'); this.loading.set(false); },
    });
  }

  markAnswered(questionId: ThreadMessageId, answerId: ThreadMessageId): void {
    this._questions.update(qs =>
      qs.map(q => q.id === questionId ? { ...q, answered_by: answerId } as unknown as OpenQuestionView : q)
    );
  }

  private _loadFromSeed(assignedTo?: ActorId): void {
    const vaultItems = this.vaultItemsService.items();
    const views: OpenQuestionView[] = SEED.thread_messages
      .filter(m => m.kind === 'question' && m.answered_by === null)
      .filter(m => {
        if (!assignedTo) return true;
        const item = vaultItems.find(vi => vi.id === m.vault_item_id);
        return item?.assigned_to === assignedTo;
      })
      .map(m => {
        const item = vaultItems.find(vi => vi.id === m.vault_item_id);
        return {
          id: m.id,
          vault_item_id: m.vault_item_id,
          vault_item_seq: item?.seq ?? 0,
          vault_item_title: item?.title ?? '(unknown)',
          vault_item_grooming_status: item?.grooming_status ?? 'ungroomed',
          vault_item_assigned_to: (item?.assigned_to ?? null) as ActorId | null,
          author_actor_id: m.author_actor_id,
          kind: 'question' as const,
          body: m.body,
          in_reply_to: m.in_reply_to,
          answered_by: null,
          created_at: m.created_at,
          age_days: (Date.now() - new Date(m.created_at).getTime()) / 86_400_000,
        };
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    this._questions.set(views);
  }
}
