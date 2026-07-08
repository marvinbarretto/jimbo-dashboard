import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

export type VaultChipKind = 'task' | 'subtask' | 'epic';
export type VaultChipCreator = 'agent' | 'human';
export type VaultChipSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-vault-chip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a
      [class]="cls()"
      [href]="resolvedHref()"
      [attr.title]="title() ?? null"
      (click)="onClick($event)"
    >
      <span class="vault-chip__prefix" aria-hidden="true">{{ prefix() }}</span>
      <span class="vault-chip__seq">{{ seq() }}</span>
      @if (title()) {
        <span class="vault-chip__title">{{ title() }}</span>
      }
      @if (epicSeq() !== null) {
        <span class="vault-chip__epic-marker">⊞ #{{ epicSeq() }}</span>
      }
    </a>
  `,
  styles: [`
    @use 'chip-size' as cs;

    /* Participate in flex layouts so a host row can stretch the chip and let long
       titles ellipsise at the available width rather than the chip's content width. */
    :host { display: inline-flex; max-width: 100%; min-width: 0; }

    .vault-chip {
      display: inline-flex;
      align-items: center;
      max-width: 100%;
      font-family: var(--font-mono);
      border-radius: var(--radius);
      border: 1px solid var(--color-border);
      border-left: 3px solid var(--proj-tint, var(--color-border));
      background: var(--color-surface);
      color: var(--color-text);
      text-decoration: none;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;

      // Only font-size/gap come from the shared scale — border stays 1px with
      // the project-tint stripe carrying the size cue on its own left-width,
      // so a chunkier tier doesn't puff up the plain right/top/bottom edges.
      @include cs.md;
      border-width: 1px;
      border-left-width: 4px;
      padding: 0.4rem 0.75rem 0.4rem 0.5rem;
      line-height: 1.5;
    }

    .vault-chip--sm {
      @include cs.sm;
      border-width: 1px;
      border-left-width: 3px;
      padding: 0.05rem 0.5rem 0.05rem 0.25rem;
      line-height: 1.4;
    }

    /* Chunkiest tier — for picker / list contexts where the item is the
       primary content (e.g. the pomo retro), not an inline reference. */
    .vault-chip--lg {
      @include cs.lg;
      border-width: 1px;
      border-left-width: 5px;
      padding: 0.55rem 1rem 0.55rem 0.7rem;
      line-height: 1.5;
    }
    .vault-chip--md .vault-chip__prefix,
    .vault-chip--lg .vault-chip__prefix { font-size: 0.85rem; }

    .vault-chip:hover {
      border-color: var(--color-border-strong);
      border-left-color: var(--proj-tint, var(--color-border-strong));
    }
    .vault-chip:focus-visible {
      @include cs.focus-ring-md;
    }
    .vault-chip--lg:focus-visible {
      @include cs.focus-ring-lg;
    }
    .vault-chip__prefix {
      color: var(--color-text-muted);
      font-size: 0.7rem;
      margin-left: 0.2rem;
    }
    .vault-chip__seq {
      color: var(--color-text-muted);
      font-weight: 500;
    }
    .vault-chip__title {
      color: var(--color-text);
      overflow: hidden;
      text-overflow: ellipsis;
      // Flex items default to min-width: auto (= content size), which keeps
      // nowrap titles from ever shrinking. Override so ellipsis kicks in when
      // the chip's parent is narrower than the title.
      min-width: 0;
    }
    .vault-chip__epic-marker {
      margin-left: 0.3rem;
      padding-left: 0.35rem;
      border-left: 1px dotted var(--color-border);
      color: var(--color-text-muted);
      font-size: 0.65rem;
    }

    .vault-chip--subtask .vault-chip__prefix,
    .vault-chip--subtask .vault-chip__seq {
      color: var(--color-text-muted);
    }

    /* Epic — wash with project tint at 45%; human-conceived = dashed border */
    .vault-chip--epic {
      border-color: color-mix(in srgb, var(--proj-tint, var(--color-border)) 70%, var(--color-border));
      background: color-mix(in srgb, var(--proj-tint, var(--color-surface)) 45%, var(--color-surface));
    }
    .vault-chip--epic .vault-chip__prefix {
      color: color-mix(in srgb, var(--proj-tint, var(--color-text-muted)) 70%, var(--color-text));
    }
    .vault-chip--epic.vault-chip--human {
      border-style: dashed;
      border-left-style: solid;
      background: color-mix(in srgb, var(--proj-tint, var(--color-surface)) 25%, var(--color-surface));
    }
  `],
})
export class VaultChip {
  readonly kind        = input.required<VaultChipKind>();
  readonly seq         = input.required<number>();
  readonly title       = input<string | null>(null);
  readonly creator     = input<VaultChipCreator>('agent');
  readonly epicSeq     = input<number | null>(null);
  readonly href        = input<string | null>(null);
  readonly size        = input<VaultChipSize>('md');
  // When true (default), plain clicks push ?detail=<seq> so a host page that
  // mounted withVaultDetailModal() opens the modal. Middle/cmd-click still
  // honours the rendered href and opens the full /vault-items route.
  readonly openInModal = input(true);

  private readonly router = inject(Router);
  private readonly route  = inject(ActivatedRoute);

  protected readonly resolvedHref = computed(() => this.href() ?? `/vault-items/${this.seq()}`);

  protected readonly prefix = computed(() => {
    switch (this.kind()) {
      case 'task':    return '#';
      case 'subtask': return '↳';
      case 'epic':    return '⊞';
    }
  });
  protected readonly cls = computed(() => {
    const parts = ['vault-chip', `vault-chip--${this.kind()}`, `vault-chip--${this.size()}`];
    if (this.kind() === 'epic' && this.creator() === 'human') parts.push('vault-chip--human');
    return parts.join(' ');
  });

  onClick(event: MouseEvent): void {
    if (!this.openInModal()) return;
    if (event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    event.preventDefault();
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { detail: this.seq() },
      queryParamsHandling: 'merge',
    });
  }
}
