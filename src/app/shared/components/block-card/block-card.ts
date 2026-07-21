import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { Priority } from '@domain/vault/vault-item';
import type { ActorId } from '@domain/ids';
import { KanbanCardLinkDirective } from '@shared/kanban/card-link.directive';
import { ItemHeader, type ItemHeaderSecondary } from '@shared/components/item-header/item-header';

export type BlockCardVariant = 'queue' | 'calendar';

// Pure display. One card, two contexts: the planner's block queue
// (not yet scheduled, draggable by the consumer) and a placed calendar
// event (has a time, may be locked) — same visual identity either way, so
// an item reads as the same object whichever list it's currently in.
//
// The identity strip (project/priority/owner/time-or-epic/lock) is the
// shared app-item-header, also used by app-vault-card — see that component
// for why. Interaction beyond lock (drag, resize) stays owned by the
// consumer, exactly like every other kanban card in this app. Opening the
// vault item is baked in here via the same KanbanCardLinkDirective +
// ?detail=<seq> mechanism VaultCard's title uses.
@Component({
  selector: 'app-block-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ItemHeader, KanbanCardLinkDirective],
  host: {
    class: 'block-card',
    '[class.block-card--calendar]': "variant() === 'calendar'",
    '[class.block-card--locked]': 'locked()',
  },
  template: `
    <app-item-header
      [projectName]="projectName()"
      [projectColor]="projectColor()"
      [seq]="seq()"
      [priority]="priority()"
      [owner]="owner()"
      [secondary]="secondary()"
      [timeText]="timeText()"
      [epicLabel]="epicLabel()"
      [showLock]="true"
      [locked]="locked()"
      [showRemove]="showRemove()"
      (lockToggle)="lockToggle.emit()"
      (remove)="remove.emit()" />
    <div class="block-card__body">
      <a class="block-card__link" [appKanbanCardLink]="seq()">{{ title() }}</a>
      <span class="block-card__size" [attr.title]="size() + ' × 25-minute blocks'">{{ size() }}×25m</span>
    </div>
  `,
  styles: [`
    :host.block-card {
      display: block;
      border: 1px solid var(--color-border);
      /* Deliberately softer than the app's sharp 2px --radius — scoped to
         this card family (block-card/vault-card), not a global token change. */
      border-radius: 10px;
      background: var(--color-surface-raised);
      overflow: hidden;
      cursor: grab;
    }
    :host.block-card--calendar {
      cursor: pointer;
      height: 100%;
    }
    /* Locked applies the same look whichever context the card is in — a
       locked queue item is exempt from randomize the same way a locked
       calendar block is exempt from being moved by it. */
    :host.block-card--locked {
      opacity: 0.75;
      cursor: default;
    }
    .block-card__body {
      padding: 0.5rem 0.6rem;
      font-size: 0.75rem;
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 0.4rem;
    }
    .block-card__link {
      color: inherit;
      text-decoration: none;
    }
    .block-card__link:hover {
      text-decoration: underline;
    }
    .block-card__size {
      font-size: 0.6rem;
      color: var(--color-text-muted);
      white-space: nowrap;
      flex-shrink: 0;
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
  readonly owner = input<ActorId | null>(null);
  readonly epicLabel = input<string | null>(null);
  readonly size = input.required<number>();
  readonly locked = input(false);
  readonly timeText = input<string | null>(null);
  // Calendar context only: × in the header strip to take the block off the
  // calendar and back into the queue without the drag-to-queue gesture.
  readonly showRemove = input(false);

  readonly lockToggle = output<void>();
  readonly remove = output<void>();

  readonly secondary = computed<ItemHeaderSecondary>(() =>
    this.variant() === 'calendar' ? 'time' : this.epicLabel() ? 'epic' : 'none',
  );
}
