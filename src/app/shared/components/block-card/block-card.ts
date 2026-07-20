import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { Priority } from '@domain/vault/vault-item';
import { KanbanCardLinkDirective } from '@shared/kanban/card-link.directive';
import { Chip } from '@shared/components/chip/chip';
import { PriorityBadge } from '@shared/components/priority-badge/priority-badge';

export type BlockCardVariant = 'queue' | 'calendar';

// Pure display. One card, two contexts: the planner's block queue
// (not yet scheduled, draggable by the consumer) and a placed calendar
// event (has a time, may be locked) — same visual identity either way, so
// an item reads as the same object whichever list it's currently in.
//
// Interaction is split: drag/resize (queue → calendar, resize-on-calendar)
// stay owned by the consumer, exactly like every other kanban card in this
// app. Opening the vault item, though, is baked in here via the same
// KanbanCardLinkDirective + ?detail=<seq> mechanism VaultCard's title uses —
// consistent behaviour wherever a vault item's title appears, not a second
// bespoke click handler. Lock only toggles from its own icon (stopPropagation),
// so it doesn't fight the title's click-to-open.
@Component({
  selector: 'app-block-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Chip, PriorityBadge, KanbanCardLinkDirective],
  host: {
    class: 'block-card',
    '[class.block-card--p0]': 'priority() === 0',
    '[class.block-card--calendar]': "variant() === 'calendar'",
    '[class.block-card--locked]': 'locked()',
  },
  template: `
    @if (variant() === 'calendar' && timeText()) {
      <div class="block-card__time">{{ timeText() }}</div>
    }
    <div class="block-card__title">
      @if (variant() === 'calendar') {
        <span class="block-card__lock" (click)="onLockClick($event)">{{ locked() ? '🔒' : '🔓' }}</span>
      }<a class="block-card__link" [appKanbanCardLink]="seq()">{{ title() }}</a>
    </div>
    <div class="block-card__meta">
      <app-chip [color]="projectColor()" [count]="size()">{{ projectName() }}</app-chip>
      <app-priority-badge [priority]="priority()" />
    </div>
  `,
  styles: [`
    :host.block-card {
      display: block;
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      background: var(--color-surface-raised);
      padding: 0.5rem 0.6rem;
      font-size: 0.75rem;
      line-height: 1.35;
      overflow: hidden;
      cursor: grab;
    }
    :host.block-card--p0 {
      border-color: var(--color-warning);
      background: color-mix(in srgb, var(--color-warning) 10%, var(--color-surface-raised));
    }
    :host.block-card--calendar {
      cursor: pointer;
      height: 100%;
    }
    :host.block-card--calendar.block-card--locked {
      opacity: 0.7;
      cursor: default;
    }
    .block-card__time {
      font-size: 0.62rem;
      color: var(--color-text-muted);
    }
    .block-card__title {
      font-size: 0.72rem;
    }
    .block-card__lock {
      margin-right: 0.25rem;
      cursor: pointer;
    }
    .block-card__link {
      color: inherit;
      text-decoration: none;
    }
    .block-card__link:hover {
      text-decoration: underline;
    }
    .block-card__meta {
      margin-top: 0.35rem;
      display: flex;
      align-items: center;
      gap: 0.35rem;
      flex-wrap: wrap;
    }
  `],
})
export class BlockCard {
  readonly variant = input<BlockCardVariant>('queue');
  readonly seq = input.required<number>();
  readonly title = input.required<string>();
  readonly projectName = input.required<string>();
  readonly projectColor = input.required<string>();
  readonly priority = input.required<Priority>();
  readonly size = input.required<number>();
  readonly locked = input(false);
  readonly timeText = input<string | null>(null);

  readonly lockToggle = output<void>();

  onLockClick(event: MouseEvent): void {
    event.stopPropagation();
    this.lockToggle.emit();
  }
}
