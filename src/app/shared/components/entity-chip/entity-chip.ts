import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type EntityType = 'actor' | 'project' | 'vault-item';

const PREFIX: Record<EntityType, string> = {
  'actor':      '@',
  'project':    '/',
  'vault-item': '#',
};

@Component({
  selector: 'app-entity-chip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span [class]="cls()" [title]="label()" [style]="chipStyle()">
      <span class="entity-chip__prefix" aria-hidden="true">{{ prefix() }}</span>
      @if (type() === 'vault-item' && seq() !== null) {
        <span class="entity-chip__seq">{{ seq() }}</span>
        <span class="entity-chip__sep" aria-hidden="true"> · </span>
      }{{ label() }}
      @if (count() != null) {
        <span class="entity-chip__count">{{ count() }}</span>
      }
    </span>
  `,
  styles: [`
    .entity-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.05em;
      font-size: 0.72rem;
      font-family: var(--font-mono);
      padding: 0.15rem 0.55rem 0.15rem 0.35rem;
      border: 1px solid var(--color-border);
      border-radius: 999px;
      background: color-mix(in srgb, var(--color-border) 40%, transparent);
      color: var(--color-text-muted);
      line-height: 1.4;
      white-space: nowrap;
      vertical-align: baseline;
    }

    .entity-chip__prefix {
      opacity: 0.6;
      font-size: 0.65em;
      margin-right: 0.05em;
    }

    .entity-chip__seq {
      opacity: 0.7;
      margin-right: 0.05em;
    }

    .entity-chip__sep {
      opacity: 0.35;
    }

    .entity-chip__count {
      margin-left: 0.3rem;
      font-size: 0.6em;
      opacity: 0.7;
      font-variant-numeric: tabular-nums;
    }

    .entity-chip--active {
      background: color-mix(in srgb, currentColor 15%, var(--color-surface));
      border-color: currentColor;
      opacity: 1;
    }

    .entity-chip--disabled {
      opacity: 0.35;
    }

    /* Actor tints */
    .entity-chip--actor.entity-chip--marvin { color: var(--actor-color-marvin); border-color: color-mix(in srgb, var(--actor-color-marvin) 40%, var(--color-border)); }
    .entity-chip--actor.entity-chip--ralph  { color: var(--actor-color-ralph);  border-color: color-mix(in srgb, var(--actor-color-ralph)  40%, var(--color-border)); }
    .entity-chip--actor.entity-chip--boris  { color: var(--actor-color-boris);  border-color: color-mix(in srgb, var(--actor-color-boris)  40%, var(--color-border)); }
    .entity-chip--actor.entity-chip--jimbo  { color: var(--actor-color-jimbo);  border-color: color-mix(in srgb, var(--actor-color-jimbo)  40%, var(--color-border)); }

    /* Project tints — color set inline via --chip-color when [color] is bound */
    .entity-chip--project {
      color: var(--chip-color, var(--color-text-muted));
      border-color: color-mix(in srgb, var(--chip-color, var(--color-border)) 40%, var(--color-border));
    }

    /* Vault-item uses accent tint */
    .entity-chip--vault-item {
      color: var(--color-accent);
      border-color: color-mix(in srgb, var(--color-accent) 30%, var(--color-border));
    }
  `],
})
export class EntityChip {
  readonly type     = input.required<EntityType>();
  readonly id       = input.required<string>();
  readonly label    = input.required<string>();
  readonly seq      = input<number | null>(null);
  readonly count    = input<number | null | undefined>(undefined);
  readonly active   = input(false);
  readonly disabled = input(false);
  readonly color    = input<string | null>(null);

  readonly prefix    = computed(() => PREFIX[this.type()]);
  readonly chipStyle = computed(() => this.color() ? { '--chip-color': this.color() } : null);
  readonly cls       = computed(() => {
    const parts = [`entity-chip entity-chip--${this.type()} entity-chip--${this.id()}`];
    if (this.active())   parts.push('entity-chip--active');
    if (this.disabled()) parts.push('entity-chip--disabled');
    return parts.join(' ');
  });
}
