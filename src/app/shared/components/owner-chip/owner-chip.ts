import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ActorId } from '@domain/ids';

// `@actor` chip with per-actor tint. Renders "—" when actorId is null.
// Display name fallback to actor id slug — caller doesn't need to resolve actors.
@Component({
  selector: 'app-owner-chip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span [class]="cls()">{{ label() }}</span>`,
  styles: [`
    .owner-chip {
      font-family: var(--font-mono);
      font-size: 0.7rem;
      color: var(--color-text-muted);
    }
    .owner-chip--marvin { color: var(--actor-color-marvin); }
    .owner-chip--ralph  { color: var(--actor-color-ralph);  }
    .owner-chip--boris  { color: var(--actor-color-boris);  }
    .owner-chip--jimbo  { color: var(--actor-color-jimbo);  }
  `],
})
export class OwnerChip {
  readonly actorId     = input.required<ActorId | null>();
  readonly displayName = input<string | null>(null);

  readonly cls = computed(() => {
    const id = this.actorId();
    return id ? `owner-chip owner-chip--${id}` : 'owner-chip';
  });

  readonly label = computed(() => {
    const id = this.actorId();
    if (!id) return '—';
    return this.displayName() ? `@${this.displayName()}` : `@${id}`;
  });
}
