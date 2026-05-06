import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, effect, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { UiBadge } from '@shared/components/ui-badge/ui-badge';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import { TriageTasksService, type InboxTask, type TriageProposal, type TriageNowCachedResult } from '../triage-tasks/triage-tasks.service';

interface CardItem {
  task: InboxTask;
  proposal: TriageProposal;
  cachedAt: string;
  runner: string;
}

@Component({
  selector: 'app-triage-swipe-page',
  imports: [UiBadge, UiEmptyState, UiLoadingState],
  templateUrl: './triage-swipe-page.html',
  styleUrl: './triage-swipe-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TriageSwipePage implements OnInit, OnDestroy {
  private readonly service = inject(TriageTasksService);

  // Page-local state — minimal. Items are derived from the shared
  // TriageTasksService (inbox loader) plus a local cache lookup.
  private readonly _cards = signal<CardItem[]>([]);
  private readonly _currentIndex = signal(0);
  private readonly _prefetching = signal(false);
  private readonly _actionLoading = signal(false);
  private readonly _actionError = signal<string | null>(null);
  // Index of cards locally skipped this session — they don't repeat
  // until next refresh. Persisted skips would need /triage-log.
  private readonly _skippedIndices = signal<ReadonlySet<number>>(new Set());

  // Feedback / re-triage UI state. Re-triage hits /triage-now with
  // user_context — server re-runs the model and overwrites the cache
  // row. The card mutates in place with the refined proposal.
  protected readonly feedbackText = signal('');
  protected readonly feedbackOpen = signal(false);
  protected readonly retriaging = signal(false);

  readonly cards = this._cards.asReadonly();
  readonly currentIndex = this._currentIndex.asReadonly();
  readonly prefetching = this._prefetching.asReadonly();
  readonly actionLoading = this._actionLoading.asReadonly();
  readonly actionError = this._actionError.asReadonly();
  readonly tasksLoading = this.service.loading;

  // Effective queue: skip-filtered cards from currentIndex forward.
  // The current card is the first non-skipped from currentIndex onward.
  readonly currentCard = computed<CardItem | null>(() => {
    const cards = this._cards();
    const skipped = this._skippedIndices();
    for (let i = this._currentIndex(); i < cards.length; i++) {
      if (!skipped.has(i)) return cards[i];
    }
    return null;
  });

  readonly progress = computed(() => {
    const total = this._cards().length;
    const skipped = this._skippedIndices().size;
    const cardsBeforeIndex = this._currentIndex();
    // "remaining" = cards from currentIndex onward minus those skipped.
    let remaining = 0;
    const skippedSet = this._skippedIndices();
    for (let i = cardsBeforeIndex; i < total; i++) {
      if (!skippedSet.has(i)) remaining++;
    }
    const done = total - remaining - skipped;
    return { total, done, remaining, skipped };
  });

  readonly inboxZero = computed(() => {
    const cards = this._cards();
    return cards.length > 0 && this.currentCard() === null;
  });

  // Track inbox tasks loading once, then prefetch their cached proposals.
  // Effect runs whenever the inbox tasks signal flips populated.
  constructor() {
    effect(() => {
      const tasks = this.service.tasks();
      if (tasks === undefined) return;
      void this.prefetchProposals(tasks);
    });

    // Auto-open the feedback panel on cards that asked questions, and
    // reset the input as the user advances. Without this, the operator
    // would have to manually expand to even see a question prompt.
    effect(() => {
      const card = this.currentCard();
      this.feedbackText.set('');
      this.feedbackOpen.set((card?.proposal.questions.length ?? 0) > 0);
    });
  }

  ngOnInit(): void {
    this.service.load();
  }

  ngOnDestroy(): void {
    // No-op: shared service doesn't need teardown here.
  }

  private async prefetchProposals(tasks: InboxTask[]): Promise<void> {
    if (tasks.length === 0) {
      this._cards.set([]);
      return;
    }
    this._prefetching.set(true);
    try {
      // Parallel — backend cache lookup is cheap (single DB row).
      const results = await Promise.all(
        tasks.map(async (task) => {
          try {
            const cached = await firstValueFrom(this.service.getCachedProposal(task.listId, task.id));
            return { task, cached };
          } catch {
            return { task, cached: null as TriageNowCachedResult | null };
          }
        }),
      );
      const cards: CardItem[] = [];
      for (const { task, cached } of results) {
        if (!cached || !cached.cached || !cached.proposal) continue;
        const debug = cached.debug as { runner?: string } | null;
        cards.push({
          task,
          proposal: cached.proposal,
          cachedAt: cached.created_at,
          runner: debug?.runner ?? 'triage-now',
        });
      }
      // Stable order: oldest task updated first — same priority as the
      // boris-loop poll picks. Operator clears backlog naturally.
      cards.sort((a, b) => (a.task.updated ?? '').localeCompare(b.task.updated ?? ''));
      this._cards.set(cards);
      this._currentIndex.set(0);
      this._skippedIndices.set(new Set());
    } finally {
      this._prefetching.set(false);
    }
  }

  // ── Actions ──────────────────────────────────────────────────────

  protected async promote(): Promise<void> {
    const card = this.currentCard();
    if (!card || this._actionLoading()) return;
    this._actionLoading.set(true);
    this._actionError.set(null);
    try {
      await firstValueFrom(
        this.service.commit({
          taskId: card.task.id,
          listId: card.task.listId,
          title: card.task.title,
          body: card.task.notes ?? undefined,
          type: card.proposal.type,
          tags: card.proposal.tags.join(','),
        }),
      );
      // Best-effort log — not blocking. The commit is the truth.
      void firstValueFrom(
        this.service.logTriageAction({
          listId: card.task.listId,
          taskId: card.task.id,
          proposal: card.proposal,
          user_context: null,
          action: 'promote',
        }),
      ).catch(() => {});
      // Don't call service.removeFromCache — it'd mutate the inbox
      // signal and re-trigger our prefetch effect mid-batch. Local
      // `_currentIndex` is the truth for swipe progression.
      this.advance();
    } catch (e) {
      this._actionError.set(this.errMsg(e));
    } finally {
      this._actionLoading.set(false);
    }
  }

  protected async discard(): Promise<void> {
    const card = this.currentCard();
    if (!card || this._actionLoading()) return;
    this._actionLoading.set(true);
    this._actionError.set(null);
    try {
      await firstValueFrom(this.service.deleteTask(card.task.listId, card.task.id));
      void firstValueFrom(
        this.service.logTriageAction({
          listId: card.task.listId,
          taskId: card.task.id,
          proposal: card.proposal,
          user_context: null,
          action: 'discard',
        }),
      ).catch(() => {});
      // Don't call service.removeFromCache — it'd mutate the inbox
      // signal and re-trigger our prefetch effect mid-batch. Local
      // `_currentIndex` is the truth for swipe progression.
      this.advance();
    } catch (e) {
      this._actionError.set(this.errMsg(e));
    } finally {
      this._actionLoading.set(false);
    }
  }

  // Skip is session-only — log it for telemetry but don't touch the
  // task. Same task surfaces again on next refresh of the page.
  protected skip(): void {
    const card = this.currentCard();
    if (!card || this._actionLoading()) return;
    void firstValueFrom(
      this.service.logTriageAction({
        listId: card.task.listId,
        taskId: card.task.id,
        proposal: card.proposal,
        user_context: null,
        action: 'skip',
      }),
    ).catch(() => {});
    // Mark this index skipped, advance past it.
    const idx = this._currentIndex();
    this._skippedIndices.update((prev) => new Set(prev).add(idx));
    this.advance();
  }

  protected refresh(): void {
    this.service.load();
  }

  protected toggleFeedback(): void {
    this.feedbackOpen.update((v) => !v);
  }

  protected onFeedbackInput(value: string): void {
    this.feedbackText.set(value);
  }

  // Re-runs /triage-now with user context, replaces the current card's
  // proposal in-place. The server-side path also upserts the cache so
  // future visits to this task see the refined version.
  protected async retriage(): Promise<void> {
    const card = this.currentCard();
    const ctx = this.feedbackText().trim();
    if (!card || !ctx || this.retriaging() || this._actionLoading()) return;
    this.retriaging.set(true);
    this._actionError.set(null);
    try {
      const result = await firstValueFrom(
        this.service.triageNow(card.task.listId, card.task.id, ctx),
      );
      if (!result.proposal) {
        this._actionError.set('Re-triage returned no parseable proposal.');
        return;
      }
      const refined: CardItem = {
        task: card.task,
        proposal: result.proposal,
        cachedAt: new Date().toISOString(),
        // /triage-now is server-side — runner reverts to triage-now
        // because boris-loop didn't produce this run.
        runner: 'triage-now',
      };
      const idx = this._currentIndex();
      this._cards.update((cards) => {
        const next = [...cards];
        if (idx < next.length) next[idx] = refined;
        return next;
      });
      this.feedbackText.set('');
      // Keep the panel open if the refined proposal still has questions.
      this.feedbackOpen.set(refined.proposal.questions.length > 0);
    } catch (e) {
      this._actionError.set(this.errMsg(e));
    } finally {
      this.retriaging.set(false);
    }
  }

  private advance(): void {
    this._currentIndex.update((i) => i + 1);
  }

  private errMsg(e: unknown): string {
    if (typeof e === 'object' && e !== null) {
      const x = e as { error?: { message?: string }; message?: string };
      return x.error?.message ?? x.message ?? 'Action failed';
    }
    return String(e);
  }

  // Display helpers used by the template.
  protected toneFor(type: TriageProposal['type']): 'info' | 'warning' | 'neutral' {
    switch (type) {
      case 'task': return 'warning';
      case 'note': return 'neutral';
      case 'idea': return 'info';
    }
  }

  protected looksLikeUrl(s: string): boolean {
    return /^https?:\/\//i.test(s.trim());
  }
}
