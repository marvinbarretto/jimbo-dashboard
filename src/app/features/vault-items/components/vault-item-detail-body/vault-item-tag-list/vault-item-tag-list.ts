import { ChangeDetectionStrategy, Component, ElementRef, input, output, signal, viewChild } from '@angular/core';

// Read-only by default; pass [editable]="true" to enable in-place adds/removes.
// Emits the full next tag array via (tagsChange) so the parent owns canonical state.
@Component({
  selector: 'app-vault-item-tag-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="vault-item-tag-list">
      @for (tag of tags(); track tag) {
        <span class="vault-item-tag-list__tag">
          {{ tag }}
          @if (editable()) {
            <button
              type="button"
              class="vault-item-tag-list__remove"
              [attr.aria-label]="'Remove tag ' + tag"
              (click)="remove(tag)">×</button>
          }
        </span>
      } @empty {
        @if (!editable()) {
          <span class="vault-item-tag-list__tag vault-item-tag-list__tag--empty">none yet</span>
        }
      }
      @if (editable()) {
        <input
          #tagInput
          class="vault-item-tag-list__input"
          type="text"
          [value]="draft()"
          placeholder="+ tag (Enter or , to add)"
          (input)="onInput($event)"
          (keydown)="onKey($event)"
          (blur)="commitDraft()"
        />
      }
    </div>
  `,
  styles: [`
    :host { display: block; }

    .vault-item-tag-list {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      align-items: center;
    }

    .vault-item-tag-list__tag {
      display: inline-flex;
      align-items: center;
      gap: 0.2rem;
      border: 1px solid var(--color-border);
      font-size: 0.7rem;
      padding: 1px 7px;
      color: var(--color-text-muted);
    }

    .vault-item-tag-list__tag--empty { font-style: italic; }

    .vault-item-tag-list__remove {
      padding: 0 0.15rem;
      margin-left: 0.1rem;
      background: transparent;
      border: none;
      border-left: 1px solid var(--color-border);
      cursor: pointer;
      color: var(--color-text-muted);
      font-size: 0.75rem;
      line-height: 1;

      &:hover { color: var(--color-danger); }
    }

    .vault-item-tag-list__input {
      min-width: 8rem;
      padding: 1px 6px;
      font: inherit;
      font-size: 0.7rem;
      background: transparent;
      border: 1px dashed var(--color-border);
      color: var(--color-text);
      border-radius: 3px;

      &:focus {
        outline: none;
        border-color: var(--color-accent);
        border-style: solid;
      }
    }
  `],
})
export class VaultItemTagList {
  readonly tags = input.required<readonly string[]>();
  readonly editable = input<boolean>(false);
  readonly tagsChange = output<readonly string[]>();

  protected readonly draft = signal('');
  private readonly inputRef = viewChild<ElementRef<HTMLInputElement>>('tagInput');

  protected onInput(e: Event): void {
    const v = (e.target as HTMLInputElement).value;
    // Comma submits the current draft, like a tag separator.
    if (v.endsWith(',')) {
      this.draft.set(v.slice(0, -1));
      this.commitDraft();
      return;
    }
    this.draft.set(v);
  }

  protected onKey(e: KeyboardEvent): void {
    if (e.key === 'Enter') {
      e.preventDefault();
      this.commitDraft();
    } else if (e.key === 'Backspace' && this.draft() === '' && this.tags().length > 0) {
      // Empty backspace pops the last tag — feels right for chip inputs.
      e.preventDefault();
      this.remove(this.tags()[this.tags().length - 1]);
    } else if (e.key === 'Escape') {
      this.draft.set('');
    }
  }

  protected commitDraft(): void {
    const next = this.draft().trim();
    if (!next) return;
    if (this.tags().includes(next)) { this.draft.set(''); return; }
    this.tagsChange.emit([...this.tags(), next]);
    this.draft.set('');
    queueMicrotask(() => this.inputRef()?.nativeElement.focus());
  }

  protected remove(tag: string): void {
    this.tagsChange.emit(this.tags().filter(t => t !== tag));
  }
}
