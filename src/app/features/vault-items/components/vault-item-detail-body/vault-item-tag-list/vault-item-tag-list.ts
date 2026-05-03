import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-vault-item-tag-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="vault-item-tag-list">
      @for (tag of tags(); track tag) {
        <span class="vault-item-tag-list__tag">{{ tag }}</span>
      } @empty {
        <span class="vault-item-tag-list__tag vault-item-tag-list__tag--empty">none yet</span>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }

    .vault-item-tag-list {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }

    .vault-item-tag-list__tag {
      border: 1px solid var(--color-border);
      font-size: 0.7rem;
      padding: 1px 7px;
      color: var(--color-text-muted);
    }

    .vault-item-tag-list__tag--empty {
      font-style: italic;
    }
  `],
})
export class VaultItemTagList {
  readonly tags = input.required<readonly string[]>();
}
