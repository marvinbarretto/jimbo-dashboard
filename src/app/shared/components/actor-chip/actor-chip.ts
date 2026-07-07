import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { ActorId } from '@domain/ids';

const NAME: Record<string, string> = {
  marvin: 'Marvin',
  kipper: 'Kipper',
  boris:  'Boris',
  jimbo:  'Jimbo',
};

@Component({
  selector: 'app-actor-chip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="actor-chip">{{ displayName() }}</span>`,
  styles: [`
    .actor-chip {
      display: inline-flex;
      align-items: center;
      font-family: var(--font-mono);
      font-size: 0.7rem;
      color: var(--color-text);
      line-height: 1;
      padding: 0.2rem 0.55rem;
      border: 1.25px solid var(--color-text);
      border-radius: 999px;
    }
  `],
})
export class ActorChip {
  readonly actor = input.required<ActorId>();

  protected readonly displayName = computed(() => NAME[this.actor() as string] ?? (this.actor() as string));
}
