import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { VaultItem, Priority } from '@domain/vault';
import { effectivePriority } from '@domain/vault';
import { ageInDays, staleNorm, ancientNorm, pulseIntensity, isStuck } from '@domain/vault';
import { PriorityBadge } from '@shared/components/priority-badge/priority-badge';
import { BlockerBadge } from '@shared/components/blocker-badge/blocker-badge';
import { EpicBadge } from '@shared/components/epic-badge/epic-badge';
import { ProjectChip } from '@shared/components/project-chip/project-chip';
import { OwnerChip } from '@shared/components/owner-chip/owner-chip';

// Pre-formatted "what just happened" data passed in from the board. Both
// fields nullable — a fresh card may have no events; an item may have no
// thread messages. Card renders only the parts present.
export interface LiveSnapshot {
  latestEvent: {
    actorLabel:  string;   // already prefixed with @ or display name
    description: string;   // e.g. "posted question", "marked done"
    at:          string;   // ISO
  } | null;
  latestMessage: {
    authorLabel:  string;
    bodyExcerpt:  string;  // truncated to ~80 chars
    at:           string;
  } | null;
}

// Presentation-only card. Receives all derived data via inputs; emits drag
// lifecycle events so the parent owns drag state and the kanban service writes.
@Component({
  selector: 'app-grooming-card',
  imports: [RouterLink, PriorityBadge, BlockerBadge, EpicBadge, ProjectChip, OwnerChip],
  templateUrl: './grooming-card.html',
  styleUrl: './grooming-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[style.--stale-norm]':      'staleNormVal()',
    '[style.--ancient-norm]':    'ancientNormVal()',
    '[style.--pulse-intensity]': 'pulseIntensityVal()',
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
  // Pre-formatted "latest event + latest message" snapshot. Rendered only when
  // the card is expanded, so the board only needs to pass meaningful data when
  // the operator actually peeks. Null = nothing to show.
  readonly liveSnapshot       = input<LiveSnapshot | null>(null);
  // Days since this item entered its current grooming column. Drives the
  // "stuck Nd" hint. 0 means no stuck signal regardless of threshold.
  readonly daysInColumn       = input<number>(0);

  readonly dragstart = output<DragEvent>();
  readonly dragend   = output<void>();

  // --- expand / collapse -------------------------------------------------
  // Card-local state — operator opens one card to see what's happening,
  // closes it when done. Persists for as long as the @for tracks this card,
  // which is "until the underlying VaultItem id changes".
  private readonly _expanded = signal(false);
  readonly expanded = this._expanded.asReadonly();
  toggleExpanded(event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this._expanded.update(v => !v);
  }

  readonly isEpic = computed(() => this.childrenCount() > 0);

  // True when `vault-decompose` has run but marvin hasn't yet approved
  // (status === 'decomposed' is the gate before 'ready'). The acceptance
  // criteria count is the visible signal — what was drafted for you to bless.
  readonly hasDraft = computed(() => this.item().grooming_status === 'decomposed');
  readonly draftCount = computed(() => this.item().acceptance_criteria.length);
  readonly draftTooltip = computed(() => {
    const n = this.draftCount();
    return `${n} acceptance criteri${n === 1 ? 'on' : 'a'} drafted — drag to Ready to approve`;
  });

  // What appears in the priority slot. Epics show the rolled-up priority of their
  // children (or nothing if none of them have one). Non-epics show their own.
  readonly displayedPriority = computed<Priority | null>(() =>
    this.isEpic() ? this.epicPriority() : effectivePriority(this.item())
  );

  readonly visibleTags = computed(() => this.item().tags.slice(0, 2));
  readonly extraTagCount = computed(() => Math.max(0, this.item().tags.length - 2));

  readonly staleNormVal  = computed(() => staleNorm(this.item(),  this.lastActivityAt()));
  readonly ancientNormVal = computed(() => ancientNorm(this.item(), this.lastActivityAt()));

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

  readonly pulseIntensityVal = computed(() => pulseIntensity(this.lastActivityAt()));

  readonly hasPulse = computed(() => this.pulseIntensityVal() > 0);

  // Stuck indicator — whole-day rounded for display. Threshold check uses the
  // raw days value to avoid "0d stuck" appearing for items just past midnight.
  readonly stuckDaysRounded = computed(() => Math.floor(this.daysInColumn()));
  readonly isStuck          = computed(() => isStuck(this.daysInColumn()));
  readonly stuckTooltip     = computed(() => {
    const d = this.stuckDaysRounded();
    return `${d} day${d === 1 ? '' : 's'} in this column — consider acting or moving`;
  });

  // Friendly relative time for the pulse tooltip — distinct from the day-grained
  // age label because pulses care about minutes, not days.
  readonly pulseTooltip = computed(() => {
    const last = this.lastActivityAt();
    if (!last) return '';
    return `updated ${formatRelative(last)}`;
  });

  // Used inside the expanded section to label each line ("· 5m ago").
  formatRelativeTime(iso: string): string {
    return formatRelative(iso);
  }

  // Forward DOM events as outputs so the parent can record dataTransfer + state.
  onDragStart(event: DragEvent): void { this.dragstart.emit(event); }
  onDragEnd(): void { this.dragend.emit(); }
}

// Compact relative-time formatter — minutes for under-an-hour, hours for under-
// a-day, days otherwise. Local because both pulse tooltip and live-snapshot
// rows want it in the same form.
function formatRelative(iso: string): string {
  const minutes = (Date.now() - new Date(iso).getTime()) / (1000 * 60);
  if (minutes < 1)   return 'just now';
  if (minutes < 60)  return `${Math.floor(minutes)}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24)    return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
