import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
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
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (hasAny()) {
      <div class="ui-mcs" role="list" aria-label="Captured metadata">
        @for (t of tags(); track t; let i = $index) {
          <span class="ui-mcs__chip ui-mcs__chip--tag" role="listitem">
            #{{ t }}
            <button
              type="button"
              class="ui-mcs__x"
              (click)="tagRemoved.emit(i)"
              [attr.aria-label]="'Remove tag ' + t"
            >×</button>
          </span>
        }

        @for (p of projects(); track p.id; let i = $index) {
          <span
            class="ui-mcs__chip ui-mcs__chip--project"
            role="listitem"
            [style.--chip-color]="p.color_token ?? 'var(--color-border)'"
          >
            <span class="ui-mcs__dot" [style.background]="p.color_token ?? 'var(--color-border)'"></span>
            {{ p.display_name }}
            <button
              type="button"
              class="ui-mcs__x"
              (click)="projectRemoved.emit(i)"
              [attr.aria-label]="'Remove project ' + p.display_name"
            >×</button>
          </span>
        }

        @if (assignee(); as a) {
          <span
            class="ui-mcs__chip ui-mcs__chip--actor"
            role="listitem"
            [style.--chip-color]="actorColor(a.id)"
          >
            <span class="ui-mcs__dot" [style.background]="actorColor(a.id)"></span>
            {{ '@' + a.display_name }}
            <button
              type="button"
              class="ui-mcs__x"
              (click)="assigneeRemoved.emit()"
              [attr.aria-label]="'Remove assignee ' + a.display_name"
            >×</button>
          </span>
        }

        @for (r of related(); track r.id; let i = $index) {
          <span class="ui-mcs__chip ui-mcs__chip--related" role="listitem">
            ~@if (r.seq != null) { #{{ r.seq }} } {{ r.title }}
            <button
              type="button"
              class="ui-mcs__x"
              (click)="relatedRemoved.emit(i)"
              [attr.aria-label]="'Remove related ' + r.title"
            >×</button>
          </span>
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
    }

    .ui-mcs__chip {
      --chip-color: var(--color-border);
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.72rem;
      background: color-mix(in srgb, var(--chip-color) 12%, transparent);
      border: 1px solid color-mix(in srgb, var(--chip-color) 40%, transparent);
      border-radius: 2px;
      padding: 0.1rem 0.4rem;
      color: var(--color-text);
      line-height: 1.4;

      &--tag { --chip-color: var(--color-accent); }
      &--related { --chip-color: var(--color-info); }
    }

    .ui-mcs__dot {
      width: 0.5rem;
      height: 0.5rem;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .ui-mcs__x {
      border: none;
      background: none;
      padding: 0;
      cursor: pointer;
      font: inherit;
      font-size: 0.85rem;
      color: var(--color-text-muted);
      line-height: 1;

      &:hover { color: var(--color-danger, #ef4444); }
      &:focus-visible {
        outline: 2px solid var(--color-accent);
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

  // Resolves the well-known per-actor accent CSS var; falls back to the
  // generic border colour for actors without a registered tint.
  protected actorColor(id: string): string {
    return `var(--actor-color-${id}, var(--color-border))`;
  }
}
