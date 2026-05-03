import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type EntityType = 'actor' | 'project' | 'vault-item';

const PREFIX: Record<EntityType, string> = {
  'actor':      '@',
  'project':    '/',
  'vault-item': '#',
};

/**
 * Unified inline chip for actors, projects, and vault items.
 * Replaces OwnerChip / ProjectChip and is the visual building block
 * for inline mentions inside SmartComposerInput.
 *
 * For vault-item, pass `seq` to render the operator-facing item number
 * alongside the title: #4252 · Task title
 */
@Component({
  selector: 'app-entity-chip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span [class]="cls()" [title]="label()">
      <span class="entity-chip__prefix" aria-hidden="true">{{ prefix() }}</span>
      @if (type() === 'vault-item' && seq() !== null) {
        <span class="entity-chip__seq">{{ seq() }}</span>
        <span class="entity-chip__sep" aria-hidden="true"> · </span>
      }{{ label() }}
    </span>
  `,
  styles: [`
    .entity-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.05em;
      font-size: 0.72rem;
      font-family: var(--font-mono);
      padding: 0.1rem 0.45rem 0.1rem 0.3rem;
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

    /* Actor tints */
    .entity-chip--actor.entity-chip--marvin { color: var(--actor-color-marvin); border-color: color-mix(in srgb, var(--actor-color-marvin) 40%, var(--color-border)); }
    .entity-chip--actor.entity-chip--ralph  { color: var(--actor-color-ralph);  border-color: color-mix(in srgb, var(--actor-color-ralph)  40%, var(--color-border)); }
    .entity-chip--actor.entity-chip--boris  { color: var(--actor-color-boris);  border-color: color-mix(in srgb, var(--actor-color-boris)  40%, var(--color-border)); }
    .entity-chip--actor.entity-chip--jimbo  { color: var(--actor-color-jimbo);  border-color: color-mix(in srgb, var(--actor-color-jimbo)  40%, var(--color-border)); }

    /* Project tints */
    .entity-chip--project.entity-chip--hermes     { color: var(--project-color-hermes);     border-color: color-mix(in srgb, var(--project-color-hermes)     40%, var(--color-border)); }
    .entity-chip--project.entity-chip--localshout { color: var(--project-color-localshout); border-color: color-mix(in srgb, var(--project-color-localshout) 40%, var(--color-border)); }
    .entity-chip--project.entity-chip--dashboard  { color: var(--project-color-dashboard);  border-color: color-mix(in srgb, var(--project-color-dashboard)  40%, var(--color-border)); }
    .entity-chip--project.entity-chip--personal   { color: var(--project-color-personal);   border-color: color-mix(in srgb, var(--project-color-personal)   40%, var(--color-border)); }

    /* Vault-item uses accent tint */
    .entity-chip--vault-item {
      color: var(--color-accent);
      border-color: color-mix(in srgb, var(--color-accent) 30%, var(--color-border));
    }
  `],
})
export class EntityChip {
  readonly type  = input.required<EntityType>();
  readonly id    = input.required<string>();
  readonly label = input.required<string>();
  /** Operator-facing sequence number — only rendered for vault-item type. */
  readonly seq   = input<number | null>(null);

  readonly prefix = computed(() => PREFIX[this.type()]);
  readonly cls    = computed(() =>
    `entity-chip entity-chip--${this.type()} entity-chip--${this.id()}`
  );
}
