import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ActorId } from '@domain/ids';

export type ActorChipSize = 'sm' | 'md' | 'lg';

const NAME: Record<string, string> = {
  marvin: 'Marvin',
  kipper: 'Kipper',
  boris:  'Boris',
  jimbo:  'Jimbo',
};

@Component({
  selector: 'app-actor-chip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span [class]="'actor-chip actor-chip--' + size()">{{ displayName() }}</span>`,
  styles: [`
    @use 'chip-size' as cs;

    .actor-chip {
      display: inline-flex;
      align-items: center;
      font-family: var(--font-mono);
      color: var(--color-text);
      line-height: 1;
      border: 1.25px solid var(--color-text);
      border-radius: 999px;

      @include cs.md;
    }

    .actor-chip--sm { @include cs.sm; }
    .actor-chip--lg { @include cs.lg; }
  `],
})
export class ActorChip {
  readonly actor = input.required<ActorId>();
  readonly size  = input<ActorChipSize>('md');

  protected readonly displayName = computed(() => NAME[this.actor() as string] ?? (this.actor() as string));
}
