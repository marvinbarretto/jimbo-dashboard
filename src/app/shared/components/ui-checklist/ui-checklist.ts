import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, input, output, signal, viewChild } from '@angular/core';

export type UiChecklistTone = 'warn' | 'err';

export interface UiChecklistStatus {
  readonly label: string;
  readonly tone: UiChecklistTone;
  readonly title?: string;
}

export interface UiChecklistItem {
  readonly text: string;
  readonly done: boolean;
  readonly status?: UiChecklistStatus | null;
}

// Editable mode emits granular events keyed by index so consumers don't have
// to mirror the array math. Append fires with the new text only; the consumer
// is responsible for pushing it onto whatever state shape it owns.
@Component({
  selector: 'app-ui-checklist',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (items().length > 0) {
      <ul class="ui-checklist">
        @for (item of items(); track item.text; let i = $index) {
          <li
            class="ui-checklist__item"
            [class.ui-checklist__item--done]="item.done"
            [class.ui-checklist__item--warn]="item.status?.tone === 'warn'"
            [class.ui-checklist__item--err]="item.status?.tone === 'err'"
            [class.ui-checklist__item--editable]="editable()">
            @if (editable()) {
              <input
                type="checkbox"
                class="ui-checklist__check"
                [checked]="item.done"
                [attr.aria-label]="'mark ' + (item.done ? 'pending' : 'done')"
                (change)="toggled.emit(i)"
              />
            } @else {
              <span class="ui-checklist__mark" [attr.aria-label]="item.done ? 'done' : 'pending'">
                {{ item.done ? '✓' : '○' }}
              </span>
            }
            @if (editable() && editingIndex() === i) {
              <input
                #editInput
                type="text"
                class="ui-checklist__edit-input"
                [value]="draft()"
                (input)="onDraftInput($event)"
                (keydown)="onDraftKey($event, i)"
                (blur)="commitEdit(i)"
              />
            } @else {
              <span
                class="ui-checklist__text"
                [class.ui-checklist__text--clickable]="editable()"
                [attr.role]="editable() ? 'button' : null"
                [attr.tabindex]="editable() ? 0 : null"
                (click)="onTextClick(i)"
                (keydown.enter)="onTextEnter(i)">{{ item.text }}</span>
            }
            @if (item.status; as s) {
              <span
                class="ui-checklist__chip"
                [class.ui-checklist__chip--warn]="s.tone === 'warn'"
                [class.ui-checklist__chip--err]="s.tone === 'err'"
                [title]="s.title ?? null">
                {{ s.label }}
              </span>
            }
            @if (editable()) {
              <button
                type="button"
                class="ui-checklist__remove"
                aria-label="remove"
                (click)="removed.emit(i)">×</button>
            }
          </li>
        }
      </ul>
    } @else if (emptyMessage(); as empty) {
      <div class="ui-checklist__empty">{{ empty }}</div>
    }

    @if (editable()) {
      <input
        #appendInput
        type="text"
        class="ui-checklist__append"
        [value]="appendDraft()"
        [placeholder]="appendPlaceholder()"
        (input)="onAppendInput($event)"
        (keydown)="onAppendKey($event)"
      />
    }
  `,
  styles: [`


    .ui-checklist {
      display: flex;
      flex-direction: column;
      gap: 3px;
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .ui-checklist__item {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 0.25rem 0.5rem;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      font-size: 0.75rem;
    }

    .ui-checklist__item--done {
      color: var(--color-text-muted);
    }

    .ui-checklist__item--done .ui-checklist__text {
      text-decoration: line-through;
    }

    .ui-checklist__item--warn {
      border-left: 2px solid var(--color-warning, #d99);
      padding-left: 0.45rem;
    }

    .ui-checklist__item--err {
      border-left: 2px solid var(--color-error, #f88);
      padding-left: 0.45rem;
    }

    .ui-checklist__mark {
      flex-shrink: 0;
      width: 1rem;
    }

    .ui-checklist__check {
      flex-shrink: 0;
      margin: 0;
    }

    .ui-checklist__text {
      flex: 1;
      padding: 0.1rem 0.3rem;
      border-radius: var(--radius);
    }

    .ui-checklist__text--clickable {
      cursor: text;

      &:hover { background: color-mix(in srgb, var(--color-accent) 8%, transparent); }
      &:focus-visible {
        outline: 2px solid var(--color-accent);
        outline-offset: 1px;
      }
    }

    .ui-checklist__edit-input {
      flex: 1;
      padding: 0.1rem 0.3rem;
      font: inherit;
      font-size: 0.78rem;
      border: 1px solid var(--color-accent);
      border-radius: var(--radius);
      background: var(--color-bg-elevated, var(--color-bg));
      color: var(--color-text);

      &:focus { outline: none; }
    }

    .ui-checklist__chip {
      font-size: 0.65rem;
      padding: 0 0.35rem;
      border-radius: 3px;
      white-space: nowrap;
    }

    .ui-checklist__chip--warn {
      background: color-mix(in oklab, var(--color-warning, #d99) 20%, transparent);
      color: var(--color-warning, #d99);
    }

    .ui-checklist__chip--err {
      background: color-mix(in oklab, var(--color-error, #f88) 20%, transparent);
      color: var(--color-error, #f88);
    }

    .ui-checklist__remove {
      padding: 0 0.4rem;
      background: transparent;
      border: none;
      cursor: pointer;
      color: var(--color-text-muted);
      font-size: 0.85rem;
      line-height: 1;

      &:hover { color: var(--color-danger); }
    }

    .ui-checklist__empty {
      padding: 0.4rem 0.6rem;
      background: #fbe7e7;
      border: 1px dashed #a33;
      color: #a33;
      font-size: 0.7rem;
    }

    .ui-checklist__append {
      margin-top: 0.4rem;
      width: 100%;
      box-sizing: border-box;
      padding: 0.45rem 0.6rem;
      font: inherit;
      font-size: 0.75rem;
      background: transparent;
      border: 1px dashed var(--color-border);
      border-radius: var(--radius);
      color: var(--color-text);

      &:focus {
        outline: none;
        border-color: var(--color-accent);
        border-style: solid;
      }
    }
  `],
})
export class UiChecklist {
  readonly items             = input.required<readonly UiChecklistItem[]>();
  readonly emptyMessage      = input<string | null>(null);
  readonly editable          = input<boolean>(false);
  readonly appendPlaceholder = input<string>('+ add item (Enter)');

  readonly toggled  = output<number>();
  readonly edited   = output<{ index: number; text: string }>();
  readonly removed  = output<number>();
  readonly appended = output<string>();

  protected readonly editingIndex = signal<number | null>(null);
  protected readonly draft        = signal('');
  protected readonly appendDraft  = signal('');
  private readonly editRef        = viewChild<ElementRef<HTMLInputElement>>('editInput');
  private readonly appendRef      = viewChild<ElementRef<HTMLInputElement>>('appendInput');

  constructor() {
    // Cancel in-flight edit when the items array changes underneath us
    // (consumer swapped the bound list).
    effect(() => {
      this.items();
      this.editingIndex.set(null);
    });
  }

  protected onTextClick(i: number): void {
    if (this.editable()) this.startEdit(i);
  }

  protected onTextEnter(i: number): void {
    if (this.editable()) this.startEdit(i);
  }

  private startEdit(i: number): void {
    this.draft.set(this.items()[i]?.text ?? '');
    this.editingIndex.set(i);
    queueMicrotask(() => {
      const el = this.editRef()?.nativeElement;
      el?.focus();
      el?.select();
    });
  }

  protected onDraftInput(e: Event): void {
    this.draft.set((e.target as HTMLInputElement).value);
  }

  protected onDraftKey(e: KeyboardEvent, i: number): void {
    if (e.key === 'Enter')       { e.preventDefault(); this.commitEdit(i); }
    else if (e.key === 'Escape') { e.preventDefault(); this.cancelEdit(); }
  }

  protected commitEdit(i: number): void {
    if (this.editingIndex() !== i) return;
    const next = this.draft().trim();
    this.editingIndex.set(null);
    if (!next) { this.removed.emit(i); return; }
    if (next === this.items()[i]?.text) return;
    this.edited.emit({ index: i, text: next });
  }

  private cancelEdit(): void {
    this.editingIndex.set(null);
    this.draft.set('');
  }

  protected onAppendInput(e: Event): void {
    this.appendDraft.set((e.target as HTMLInputElement).value);
  }

  protected onAppendKey(e: KeyboardEvent): void {
    if (e.key === 'Enter') {
      e.preventDefault();
      const text = this.appendDraft().trim();
      if (!text) return;
      this.appended.emit(text);
      this.appendDraft.set('');
      queueMicrotask(() => this.appendRef()?.nativeElement.focus());
    } else if (e.key === 'Escape') {
      this.appendDraft.set('');
    }
  }
}
