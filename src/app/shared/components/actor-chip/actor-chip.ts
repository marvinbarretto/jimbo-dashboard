import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ActorId } from '@domain/ids';
import { ActorAvatar, type ActorAvatarSize } from '@shared/components/actor-avatar/actor-avatar';

const NAME: Record<string, string> = {
  marvin: 'Marvin',
  ralph:  'Ralph',
  boris:  'Boris',
  jimbo:  'Jimbo',
};

@Component({
  selector: 'app-actor-chip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ActorAvatar],
  template: `
    <span [class]="cls()">
      <app-actor-avatar [actor]="actor()" [size]="size()" />
      @if (compact() === false) {
        <span class="actor-chip__name">{{ displayName() }}</span>
      }
    </span>
  `,
  styles: [`
    .actor-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      font-family: var(--font-mono);
      font-size: 0.7rem;
      color: var(--color-text);
      line-height: 1;
      padding: 0.125rem 0.4rem 0.125rem 0.3rem;
      border-left: 3px solid var(--proj-tint, transparent);
      border-radius: 0 var(--radius) var(--radius) 0;
    }
    .actor-chip--no-stripe {
      border-left: 0;
      padding-left: 0;
    }
    .actor-chip--compact {
      padding: 0;
      border-left: 0;
    }
    .actor-chip__name {
      color: var(--color-text);
    }
  `],
})
export class ActorChip {
  readonly actor   = input.required<ActorId>();
  readonly size    = input<ActorAvatarSize>('sm');
  readonly compact = input<boolean>(false);
  readonly stripe  = input<boolean>(true);

  protected readonly displayName = computed(() => NAME[this.actor() as string] ?? (this.actor() as string));
  protected readonly cls = computed(() => {
    const parts = ['actor-chip'];
    if (this.compact()) parts.push('actor-chip--compact');
    else if (!this.stripe()) parts.push('actor-chip--no-stripe');
    return parts.join(' ');
  });
}
