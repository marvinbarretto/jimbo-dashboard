import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { KanbanCardLinkDirective } from '@shared/kanban/card-link.directive';

// Wraps a vault-item card with its parent's identity so the operator sees
// "this card lives inside #963" before scanning the card itself. Composition,
// not inheritance — any list view can wrap an `<app-grooming-card>` (or any
// future card surface) in this component when the item has a parent_id.
//
// Renders nothing extra when parentSeq is null — keeps board templates terse:
// callers can wrap unconditionally if it's cleaner than @if-ing each card.
@Component({
  selector: 'app-grooming-nest',
  imports: [KanbanCardLinkDirective],
  templateUrl: './grooming-nest.html',
  styleUrl: './grooming-nest.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GroomingNest {
  readonly parentSeq   = input<number | null>(null);
  readonly parentTitle = input<string>('');
}
