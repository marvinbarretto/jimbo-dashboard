import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { VaultItem, Priority } from '@domain/vault';
import { effectivePriority } from '@domain/vault';
import { ageInDays, stalenessRatioFor } from '@domain/vault';
import { PriorityBadge } from '@shared/components/priority-badge/priority-badge';
import { BlockerBadge } from '@shared/components/blocker-badge/blocker-badge';
import { EpicBadge } from '@shared/components/epic-badge/epic-badge';
import { ProjectChip } from '@shared/components/project-chip/project-chip';
import { OwnerChip } from '@shared/components/owner-chip/owner-chip';

// Presentation-only card. Receives all derived data via inputs; emits drag
// lifecycle events so the parent owns drag state and the kanban service writes.
@Component({
  selector: 'app-grooming-card',
  imports: [RouterLink, PriorityBadge, BlockerBadge, EpicBadge, ProjectChip, OwnerChip],
  templateUrl: './grooming-card.html',
  styleUrl: './grooming-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Bind the staleness ratio as a CSS custom property on the host so the
  // stylesheet can interpolate colours continuously without needing class swaps.
  host: {
    '[style.--age-norm]': 'ageNorm()',
  },
})
export class GroomingCard {
  readonly item               = input.required<VaultItem>();
  readonly project            = input<{ id: string; display_name: string } | null>(null);
  readonly openQuestionsCount = input<number>(0);
  readonly parentSeq          = input<number | null>(null);
  readonly childrenCount      = input<number>(0);
  // For epic cards: the most-urgent priority of unfinished children rolled up.
  // The card hides its own priority on epics and shows this instead — Agile-style:
  // an epic's urgency is derived from what's underneath it, not declared on the
  // container. Null = epic has no children with priorities (badge hidden).
  // Ignored for non-epics.
  readonly epicPriority       = input<Priority | null>(null);
  readonly dragging           = input<boolean>(false);
  // Most recent event timestamp for the item — drives staleness more accurately than
  // created_at alone. Null/undefined falls back to created_at in the staleness function.
  readonly lastActivityAt     = input<string | null>(null);

  readonly dragstart = output<DragEvent>();
  readonly dragend   = output<void>();

  readonly isEpic = computed(() => this.childrenCount() > 0);

  // What appears in the priority slot. Epics show the rolled-up priority of their
  // children (or nothing if none of them have one). Non-epics show their own.
  readonly displayedPriority = computed<Priority | null>(() =>
    this.isEpic() ? this.epicPriority() : effectivePriority(this.item())
  );

  readonly visibleTags = computed(() => this.item().tags.slice(0, 2));
  readonly extraTagCount = computed(() => Math.max(0, this.item().tags.length - 2));

  // 0..1 ratio of card age vs the staleness ceiling. Interpolated by CSS into
  // a continuous border / shadow gradient — fresh cards are flat, old cards
  // pull focus.
  readonly ageNorm = computed(() =>
    stalenessRatioFor(this.item(), this.lastActivityAt())
  );

  readonly ageDaysRounded = computed(() =>
    Math.floor(ageInDays(this.lastActivityAt() ?? this.item().created_at))
  );

  readonly ageTooltip = computed(() => {
    const days = this.ageDaysRounded();
    if (days <= 0) return 'today';
    return `${days} day${days === 1 ? '' : 's'} since last activity`;
  });

  // Compact label shown on the card itself ("4d", "today"). The gradient conveys
  // urgency at a glance; this gives precision for the operator's eye.
  readonly ageLabel = computed(() => {
    const days = this.ageDaysRounded();
    return days <= 0 ? 'today' : `${days}d`;
  });

  // Forward DOM events as outputs so the parent can record dataTransfer + state.
  onDragStart(event: DragEvent): void { this.dragstart.emit(event); }
  onDragEnd(): void { this.dragend.emit(); }
}
