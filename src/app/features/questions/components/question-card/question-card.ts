import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { OpenQuestionView, CreateThreadMessagePayload } from '@domain/thread';
import { actorId } from '@domain/ids';
import { ActorsService } from '@features/actors/data-access/actors.service';
import { VaultItemsService } from '@features/vault-items/data-access/vault-items.service';
import { QuestionReplyComposer } from '@shared/components/question-reply-composer/question-reply-composer';
import { EntityChip } from '@shared/components/entity-chip/entity-chip';
import { relativeTime } from '@shared/utils/datetime.utils';

@Component({
  selector: 'app-question-card',
  imports: [RouterLink, QuestionReplyComposer, EntityChip],
  templateUrl: './question-card.html',
  styleUrl: './question-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionCard {
  readonly question = input.required<OpenQuestionView>();
  readonly answered  = output<CreateThreadMessagePayload>();

  private readonly actorsService = inject(ActorsService);
  private readonly vaultItemsService = inject(VaultItemsService);

  readonly showReply = signal(false);
  readonly currentActorId = actorId('marvin');

  readonly item = computed(() => this.vaultItemsService.getById(this.question().vault_item_id));
  readonly parentItem = computed(() => {
    const item = this.item();
    return item?.parent_id ? this.vaultItemsService.getById(item.parent_id) : undefined;
  });

  readonly authorLabel = computed(() => {
    const a = this.actorsService.getById(this.question().author_actor_id);
    return a?.display_name ?? this.question().author_actor_id;
  });

  readonly authorKind = computed(() => {
    return this.actorsService.getById(this.question().author_actor_id)?.kind ?? 'system';
  });

  // Synthetic ThreadMessage shape required by QuestionReplyComposer
  readonly asThreadMessage = computed(() => ({
    id: this.question().id,
    vault_item_id: this.question().vault_item_id,
    author_actor_id: this.question().author_actor_id,
    kind: 'question' as const,
    body: this.question().body,
    in_reply_to: this.question().in_reply_to,
    answered_by: null,
    created_at: this.question().created_at,
  }));

  readonly ageLabel = computed(() => {
    const d = Math.floor(this.question().age_days);
    if (d <= 0) return 'today';
    if (d === 1) return '1d ago';
    return `${d}d ago`;
  });

  readonly itemSourceLabel = computed(() => {
    const source = this.item()?.source;
    if (!source) return 'origin unknown';
    if (source.kind === 'agent') return `agent-origin ${source.ref}`;
    if (source.kind === 'manual') return `manual ${source.ref}`;
    if (source.kind === 'github') return `github ${source.ref}`;
    if (source.kind === 'pr-comment') return `pr comment ${source.ref}`;
    return `${source.kind} ${source.ref}`;
  });

  readonly hierarchyLabel = computed(() => {
    const parent = this.parentItem();
    if (parent) return `sub-item of #${parent.seq}`;

    const childrenCount = this.item()?.children_count ?? 0;
    if (childrenCount > 0) return `${childrenCount} sub-item${childrenCount === 1 ? '' : 's'}`;

    return 'standalone';
  });

  readonly projectLabel = computed(() => this.item()?.primary_project_name ?? null);

  readonly createdLabel = computed(() => {
    const item = this.item();
    if (!item) return this.ageLabel();
    return this.formatAbsoluteDate(item.created_at);
  });

  readonly updatedLabel = computed(() => {
    const item = this.item();
    const latest = item?.latest_activity_at;
    return latest ? relativeTime(latest) : null;
  });

  readonly contextSummary = computed(() => {
    const bits = [this.itemSourceLabel(), this.hierarchyLabel()];
    const project = this.projectLabel();
    if (project) bits.push(project);
    return bits.join(' · ');
  });

  toggleReply(): void { this.showReply.update(v => !v); }

  onReplyPosted(payload: CreateThreadMessagePayload): void {
    this.answered.emit(payload);
    this.showReply.set(false);
  }

  private formatAbsoluteDate(iso: string): string {
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(iso));
  }
}
