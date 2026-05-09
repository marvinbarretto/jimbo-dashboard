import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { EntityChip } from '@shared/components/entity-chip/entity-chip';
import type { Project } from '@domain/projects/project';
import type { Actor } from '@domain/actors/actor';
import type { VaultItemId } from '@domain/ids';

export interface MentionRelatedRef {
  readonly id: VaultItemId;
  readonly title: string;
  readonly seq: number | null;
}

/**
 * Renders the four chip categories the mention triggers can produce — tags
 * (`#`), projects (`@`), assignee (`@`), related items (`~`) — each with an
 * inline `×` to remove. Used by the unified vault-item dialog (was
 * CaptureDialog's bespoke `cap__chip*` block) and reusable for any composer
 * that wires up the same MentionDirective triggers.
 *
 * Pure presentation: removals are emitted as outputs; the host manages
 * source-of-truth state. Renders nothing when all four lists are empty,
 * so it can sit unconditionally in a layout without taking visual space
 * pre-input.
 */
@Component({
  selector: 'app-ui-mention-chip-strip',
  imports: [EntityChip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (hasAny()) {
      <div class="ui-mcs" role="list" aria-label="Captured metadata">
        @for (t of tags(); track t; let i = $index) {
          <span class="ui-mcs__tag" role="listitem">
            #{{ t }}
            <button
              type="button"
              class="ui-mcs__tag-x"
              (click)="tagRemoved.emit(i)"
              [attr.aria-label]="'Remove tag ' + t"
            >×</button>
          </span>
        }

        @for (p of projects(); track p.id; let i = $index) {
          <app-entity-chip
            type="project"
            [id]="p.id"
            [label]="p.display_name"
            [color]="p.color_token"
            [removable]="true"
            (removed)="projectRemoved.emit(i)"
          />
        }

        @if (assignee(); as a) {
          <app-entity-chip
            type="actor"
            [id]="a.id"
            [label]="a.display_name"
            [removable]="true"
            (removed)="assigneeRemoved.emit()"
          />
        }

        @for (r of related(); track r.id; let i = $index) {
          <app-entity-chip
            type="vault-item"
            [id]="r.id"
            [label]="r.title"
            [seq]="r.seq"
            [removable]="true"
            (removed)="relatedRemoved.emit(i)"
          />
        }
      </div>
    }
  `,
  styles: [`
    :host { display: block; }

    .ui-mcs {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      align-items: center;
    }

    /* Tags are free-text labels (no entity backing) so they don't go through
       EntityChip; keep a minimal pill rendering for visual parity. */
    .ui-mcs__tag {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.72rem;
      font-family: var(--font-mono);
      padding: 0.15rem 0.55rem;
      border: 1px solid color-mix(in srgb, var(--color-accent) 40%, var(--color-border));
      border-radius: 999px;
      background: color-mix(in srgb, var(--color-accent) 12%, transparent);
      color: var(--color-text);
      line-height: 1.4;
    }

    .ui-mcs__tag-x {
      border: none;
      background: none;
      padding: 0 0.05rem;
      cursor: pointer;
      font: inherit;
      font-size: 0.95em;
      line-height: 1;
      color: inherit;
      opacity: 0.55;

      &:hover { opacity: 1; color: var(--color-danger, #ef4444); }
      &:focus-visible {
        outline: 2px solid currentColor;
        outline-offset: 1px;
        border-radius: 2px;
      }
    }
  `],
})
export class UiMentionChipStrip {
  readonly tags     = input<readonly string[]>([]);
  readonly projects = input<readonly Project[]>([]);
  readonly assignee = input<Actor | null>(null);
  readonly related  = input<readonly MentionRelatedRef[]>([]);

  readonly tagRemoved      = output<number>();
  readonly projectRemoved  = output<number>();
  readonly assigneeRemoved = output<void>();
  readonly relatedRemoved  = output<number>();

  protected readonly hasAny = computed(() =>
    this.tags().length > 0
    || this.projects().length > 0
    || this.assignee() !== null
    || this.related().length > 0,
  );
}
