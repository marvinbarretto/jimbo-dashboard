import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

// Visual emphasis. `muted` = calm persisted tag (detail side-panel); `accent` =
// freshly-captured tag that should pop (mention capture strip). Add a tone only
// when a consumer needs it — don't speculatively grow the palette.
export type TagChipTone = 'muted' | 'accent';
export type TagChipSize = 'sm' | 'md' | 'lg';

/**
 * Primitive pill for a single free-text tag. Tags have no entity backing, so
 * they deliberately don't go through `EntityChip` (which needs an actor /
 * project / vault-item type) — this is the shared home for the bespoke
 * tag-pill markup that `vault-item-tag-list` and `ui-mention-chip-strip` each
 * used to hand-roll.
 *
 * Per-chip, mirroring `EntityChip`'s shape: the caller loops and owns list
 * semantics (`role="list"` on the container). The chip stays neutral.
 */
@Component({
  selector: 'app-tag-chip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span [class]="'tag-chip tag-chip--' + tone() + ' tag-chip--' + size()">
      @if (prefix()) {
        <span class="tag-chip__prefix" aria-hidden="true">{{ prefix() }}</span>
      }
      <span class="tag-chip__label">{{ label() }}</span>
      @if (removable()) {
        <button
          type="button"
          class="tag-chip__remove"
          [attr.aria-label]="'Remove tag ' + label()"
          (click)="removed.emit()"
        >×</button>
      }
    </span>
  `,
  styles: [`
    @use 'chip-size' as cs;

    :host { display: inline-flex; min-width: 0; }

    .tag-chip {
      display: inline-flex;
      align-items: center;
      border: 1px solid var(--color-border);
      border-radius: 999px;
      color: var(--color-text-muted);
      line-height: 1.4;
      min-width: 0;

      @include cs.md;
    }

    .tag-chip--sm { @include cs.sm; }
    .tag-chip--lg { @include cs.lg; }

    .tag-chip--accent {
      border-color: color-mix(in srgb, var(--color-accent) 40%, var(--color-border));
      background: color-mix(in srgb, var(--color-accent) 12%, transparent);
      color: var(--color-text);
    }

    .tag-chip__prefix { opacity: 0.7; }

    .tag-chip__label {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .tag-chip__remove {
      border: none;
      background: none;
      padding: 0 0.05rem;
      cursor: pointer;
      font: inherit;
      font-size: 0.95em;
      line-height: 1;
      color: inherit;
      opacity: 0.55;

      &:hover { opacity: 1; color: var(--color-danger); }
      &:focus-visible {
        outline: 2px solid currentColor;
        outline-offset: 1px;
        border-radius: 2px;
      }
    }
  `],
})
export class TagChip {
  readonly label = input.required<string>();
  /** Sigil before the label (e.g. `#`). Omitted for plain tags. */
  readonly prefix = input<string | null>(null);
  readonly tone = input<TagChipTone>('muted');
  readonly size = input<TagChipSize>('md');
  readonly removable = input<boolean>(false);

  readonly removed = output<void>();
}
