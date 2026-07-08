import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

export type EntityType = 'actor' | 'project' | 'vault-item';
export type EntityChipVariant = 'soft' | 'solid';
export type EntityChipSize = 'sm' | 'md' | 'lg';

const PREFIX: Record<EntityType, string> = {
  'actor':      '@',
  'project':    '/',
  'vault-item': '#',
};

@Component({
  selector: 'app-entity-chip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      [class]="cls()"
      [title]="label()"
      [style]="chipStyle()"
      [attr.role]="clickable() ? 'button' : null"
      [attr.tabindex]="clickable() ? 0 : null"
      (click)="onChipClick()"
      (keydown.enter)="onChipEnter($event)"
    >
      <span class="entity-chip__prefix" aria-hidden="true">{{ prefix() }}</span>
      @if (type() === 'vault-item' && seq() !== null) {
        <span class="entity-chip__seq">{{ seq() }}</span>
        <span class="entity-chip__sep" aria-hidden="true"> · </span>
      }{{ label() }}
      @if (count() != null) {
        <span class="entity-chip__count">{{ count() }}</span>
      }
      @if (removable()) {
        <button
          type="button"
          class="entity-chip__remove"
          [attr.aria-label]="'Remove ' + label()"
          (click)="removed.emit(); $event.stopPropagation()"
        >×</button>
      }
    </span>
  `,
  styles: [`
    @use 'chip-size' as cs;

    .entity-chip {
      display: inline-flex;
      align-items: center;
      font-family: var(--font-mono);
      border: 1px solid var(--color-border);
      border-radius: 999px;
      background: color-mix(in srgb, var(--color-border) 40%, transparent);
      color: var(--color-text-muted);
      line-height: 1.4;
      white-space: nowrap;
      vertical-align: baseline;

      @include cs.md;
      // Prefix glyph wants tighter lead-in space than the shared right-hand
      // padding — kept as a per-component override, not part of the shared scale.
      padding-left: 0.55em;
    }

    .entity-chip--sm {
      @include cs.sm;
      padding-left: 0.35em;
      gap: 0.05em;
    }

    .entity-chip--lg {
      @include cs.lg;
      padding-left: 0.7em;
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
      margin-left: 0.35rem;
      font-size: 0.75em;
      font-variant-numeric: tabular-nums;
      background: color-mix(in srgb, currentColor 18%, transparent);
      border: 1px solid color-mix(in srgb, currentColor 30%, transparent);
      border-radius: 999px;
      padding: 0 0.35em;
      line-height: 1.5;
      min-width: 1.4em;
      text-align: center;
    }

    .entity-chip__remove {
      margin-left: 0.25rem;
      padding: 0 0.05rem;
      border: none;
      background: none;
      color: inherit;
      opacity: 0.55;
      cursor: pointer;
      font: inherit;
      font-size: 0.95em;
      line-height: 1;

      &:hover { opacity: 1; color: var(--color-danger, #ef4444); }
      &:focus-visible {
        outline: 2px solid currentColor;
        outline-offset: 1px;
        border-radius: 2px;
      }
    }

    .entity-chip--disabled {
      opacity: 0.35;
    }

    /* Actors are intentionally monochrome — see ActorAvatar/ActorChip.
       EntityChip's actor type renders the @ prefix + name without any tint
       so the primary palette stays free for state. */
    .entity-chip--actor {
      color: var(--color-text);
      border-color: var(--color-text);
    }

    /* Project tints — color set inline via --chip-color when [color] is bound */
    .entity-chip--project {
      color: var(--chip-color, var(--color-text-muted));
      border-color: color-mix(in srgb, var(--chip-color, var(--color-border)) 40%, var(--color-border));
    }

    /* Solid project pill — full project colour as background, dark text on top.
       Used on the unified vault-card to give project the strongest identity cue. */
    .entity-chip--project.entity-chip--solid {
      background: var(--chip-color, var(--color-border));
      color: var(--color-bg);
      border-color: var(--chip-color, var(--color-border));
    }
    .entity-chip--project.entity-chip--solid .entity-chip__prefix {
      color: var(--color-bg);
      opacity: 0.7;
    }

    /* Vault-item uses accent tint */
    .entity-chip--vault-item {
      color: var(--color-accent);
      border-color: color-mix(in srgb, var(--color-accent) 30%, var(--color-border));
    }

    /* Selected = solid fill with bg-coloured text — mirrors the 'solid' variant
       so an active filter chip reads instantly. Defined after the type styles
       (and doubled up for specificity) so it wins their color declarations:
       project → project colour, actor → monochrome invert, vault-item → accent. */
    .entity-chip.entity-chip--active {
      background: var(--chip-color, var(--color-text));
      border-color: var(--chip-color, var(--color-text));
      color: var(--color-bg);
      opacity: 1;
    }
    .entity-chip--vault-item.entity-chip--active {
      background: var(--color-accent);
      border-color: var(--color-accent);
    }

    .entity-chip--clickable {
      cursor: pointer;

      &:hover:not(.entity-chip--active) {
        border-color: color-mix(in srgb, var(--chip-color, var(--color-accent)) 60%, var(--color-border));
        color: var(--chip-color, var(--color-accent));
      }

      &:focus-visible {
        @include cs.focus-ring-md;
      }
    }

    .entity-chip--lg.entity-chip--clickable:focus-visible {
      @include cs.focus-ring-lg;
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
  readonly variant  = input<EntityChipVariant>('soft');
  readonly size     = input<EntityChipSize>('md');
  /** When true, renders a trailing × that emits `removed`. Host owns state. */
  readonly removable  = input(false);
  readonly removed    = output<void>();
  readonly clickable  = input(false);
  readonly clicked    = output<void>();

  readonly prefix    = computed(() => PREFIX[this.type()]);
  readonly chipStyle = computed(() => this.color() ? { '--chip-color': this.color() } : null);
  readonly cls       = computed(() => {
    const parts = [`entity-chip entity-chip--${this.type()} entity-chip--${this.id()} entity-chip--${this.variant()} entity-chip--${this.size()}`];
    if (this.active())    parts.push('entity-chip--active');
    if (this.disabled())  parts.push('entity-chip--disabled');
    if (this.clickable()) parts.push('entity-chip--clickable');
    return parts.join(' ');
  });

  onChipClick(): void {
    if (this.clickable()) this.clicked.emit();
  }

  onChipEnter(e: Event): void {
    if (this.clickable()) { e.preventDefault(); this.clicked.emit(); }
  }
}
