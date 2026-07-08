import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { EntityChip, type EntityChipSize } from '@shared/components/entity-chip/entity-chip';
import { TagChip } from '@shared/components/tag-chip/tag-chip';
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
  imports: [EntityChip, TagChip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (hasAny()) {
      <div class="ui-mcs" role="list" aria-label="Captured metadata">
        @for (t of tags(); track t; let i = $index) {
          <app-tag-chip
            role="listitem"
            [label]="t"
            prefix="#"
            tone="accent"
            [size]="size()"
            [removable]="true"
            (removed)="tagRemoved.emit(i)"
          />
        }

        @for (p of projects(); track p.id; let i = $index) {
          <app-entity-chip
            type="project"
            [size]="size()"
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
            [size]="size()"
            [id]="a.id"
            [label]="a.display_name"
            [removable]="true"
            (removed)="assigneeRemoved.emit()"
          />
        }

        @for (r of related(); track r.id; let i = $index) {
          <app-entity-chip
            type="vault-item"
            [size]="size()"
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

    /* Tags (free-text, no entity backing) render via <app-tag-chip>; projects /
       assignee / related delegate to <app-entity-chip>. No tag styles live here. */
  `],
})
export class UiMentionChipStrip {
  readonly tags     = input<readonly string[]>([]);
  readonly projects = input<readonly Project[]>([]);
  readonly assignee = input<Actor | null>(null);
  readonly related  = input<readonly MentionRelatedRef[]>([]);
  // Defaults 'sm' — this strip sits in dense composer/capture rows today.
  // Forwarded rather than hardcoded so a roomier host can opt into 'md'/'lg'.
  readonly size     = input<EntityChipSize>('sm');

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
