import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ActorId } from '@domain/ids';

export type ActorAvatarSize = 'sm' | 'md' | 'lg';
export type ActorAvatarVariant = 'outlined' | 'filled';

const MONOGRAM: Record<string, string> = {
  marvin: 'M',
  ralph:  'R',
  boris:  'B',
  jimbo:  'J',
};

const HUMAN_ACTORS: ReadonlySet<string> = new Set(['marvin']);

@Component({
  selector: 'app-actor-avatar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span [class]="cls()" [attr.title]="actor()" [attr.aria-label]="actor()">{{ monogram() }}</span>`,
  styles: [`
    .actor-avatar {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background: transparent;
      color: var(--color-text);
      border: 1.5px solid var(--color-text);
      font-family: var(--font-mono);
      font-weight: 600;
      line-height: 1;
      flex-shrink: 0;
      vertical-align: middle;
    }
    .actor-avatar--sm { width: 1rem;    height: 1rem;    font-size: 0.55rem; border-width: 1.25px; }
    .actor-avatar--md { width: 1.375rem; height: 1.375rem; font-size: 0.7rem;  border-width: 1.5px; }
    .actor-avatar--lg { width: 2rem;    height: 2rem;    font-size: 0.9rem;  border-width: 2px; }

    /* Solid ring is the default (agents). Dashed marks human (Marvin). */
    .actor-avatar--human { border-style: dashed; }

    /* High-emphasis variant — filled ink with inverted text. Use sparingly. */
    .actor-avatar--filled {
      background: var(--color-text);
      color: var(--color-bg);
      border-color: var(--color-text);
    }
    .actor-avatar--filled.actor-avatar--human {
      background: transparent;
      color: var(--color-text);
      border-style: dashed;
    }
  `],
})
export class ActorAvatar {
  readonly actor   = input.required<ActorId>();
  readonly size    = input<ActorAvatarSize>('md');
  readonly variant = input<ActorAvatarVariant>('outlined');

  protected readonly monogram = computed(() => MONOGRAM[this.actor() as string] ?? '?');
  protected readonly cls = computed(() => {
    const parts = ['actor-avatar', `actor-avatar--${this.size()}`, `actor-avatar--${this.variant()}`];
    if (HUMAN_ACTORS.has(this.actor() as string)) parts.push('actor-avatar--human');
    return parts.join(' ');
  });
}
