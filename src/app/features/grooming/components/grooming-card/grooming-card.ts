import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { VaultItem, Priority } from '../../../../domain/vault/vault-item';
import { effectivePriority } from '../../../../domain/vault/readiness';
import type { ActorId } from '../../../../domain/ids';
import { PriorityBadge } from '../../../../shared/components/priority-badge/priority-badge';
import { BlockerBadge } from '../../../../shared/components/blocker-badge/blocker-badge';
import { ProjectChip } from '../../../../shared/components/project-chip/project-chip';
import { OwnerChip } from '../../../../shared/components/owner-chip/owner-chip';

// Presentation-only card. Receives all derived data via inputs; emits drag
// lifecycle events so the parent owns drag state and the kanban service writes.
@Component({
  selector: 'app-grooming-card',
  imports: [RouterLink, PriorityBadge, BlockerBadge, ProjectChip, OwnerChip],
  templateUrl: './grooming-card.html',
  styleUrl: './grooming-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GroomingCard {
  readonly item               = input.required<VaultItem>();
  readonly project            = input<{ id: string; display_name: string } | null>(null);
  readonly openQuestionsCount = input<number>(0);
  readonly parentSeq          = input<number | null>(null);
  readonly childrenCount      = input<number>(0);
  readonly dragging           = input<boolean>(false);

  readonly dragstart = output<DragEvent>();
  readonly dragend   = output<void>();

  readonly priority = computed<Priority | null>(() => effectivePriority(this.item()));

  readonly visibleTags = computed(() => this.item().tags.slice(0, 2));
  readonly extraTagCount = computed(() => Math.max(0, this.item().tags.length - 2));

  // Forward DOM events as outputs so the parent can record dataTransfer + state.
  onDragStart(event: DragEvent): void { this.dragstart.emit(event); }
  onDragEnd(): void { this.dragend.emit(); }
}
