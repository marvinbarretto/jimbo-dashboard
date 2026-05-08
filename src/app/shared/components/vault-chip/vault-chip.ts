import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type VaultChipKind = 'task' | 'subtask' | 'epic';
export type VaultChipCreator = 'agent' | 'human';

@Component({
  selector: 'app-vault-chip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a [class]="cls()" [href]="href()" [attr.title]="title() ?? null">
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
    .vault-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      max-width: 100%;
      font-family: var(--font-mono);
      font-size: 0.7rem;
      line-height: 1.4;
      padding: 0.05rem 0.5rem 0.05rem 0.25rem;
      border-radius: var(--radius);
      border: 1px solid var(--color-border);
      border-left: 3px solid var(--proj-tint, var(--color-border));
      background: var(--color-surface);
      color: var(--color-text);
      text-decoration: none;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
    .vault-chip:hover {
      border-color: var(--color-border-strong);
      border-left-color: var(--proj-tint, var(--color-border-strong));
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
  readonly kind    = input.required<VaultChipKind>();
  readonly seq     = input.required<number>();
  readonly title   = input<string | null>(null);
  readonly creator = input<VaultChipCreator>('agent');
  readonly epicSeq = input<number | null>(null);
  readonly href    = input<string>('#');

  protected readonly prefix = computed(() => {
    switch (this.kind()) {
      case 'task':    return '#';
      case 'subtask': return '↳';
      case 'epic':    return '⊞';
    }
  });
  protected readonly cls = computed(() => {
    const parts = ['vault-chip', `vault-chip--${this.kind()}`];
    if (this.kind() === 'epic' && this.creator() === 'human') parts.push('vault-chip--human');
    return parts.join(' ');
  });
}
