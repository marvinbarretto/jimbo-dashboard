import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, input, output, signal, viewChild } from '@angular/core';
import { UiChecklist, type UiChecklistItem } from '@shared/components/ui-checklist/ui-checklist';
import { UiReadinessPanel, type UiReadinessData } from '@shared/components/ui-readiness-panel/ui-readiness-panel';
import { UiSubhead } from '@shared/components/ui-subhead/ui-subhead';
import { UiSubsection } from '@shared/components/ui-subsection/ui-subsection';
import type { AcceptanceCriterion } from '@domain/vault/vault-item';
import { acceptanceCriterionStatus } from '@shared/validation/acceptance-criterion-length';

// Read-only mode keeps the existing UiChecklist render (with status badges).
// Editable mode swaps to an inline editor: toggle done, click-to-edit text,
// remove, append. Emits the full next AcceptanceCriterion[] via (criteriaChange).
//
// Caveat: the API serializer currently flattens AC to newline-joined text and
// drops `done` on round-trip (existing limitation). Toggling `done` is locally
// reactive but won't survive a page reload until the API gains structured AC.
@Component({
  selector: 'app-vault-item-delivery-block',
  imports: [UiChecklist, UiReadinessPanel, UiSubhead, UiSubsection],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-ui-subsection label="Delivery">
      @if (readiness(); as r) {
        <app-ui-readiness-panel [data]="r" />
      }

      <app-ui-subhead label="Acceptance criteria" [count]="criteria().length" />

      @if (editable()) {
        @if (criteria().length === 0) {
          <p class="vault-item-delivery-block__empty-soft">No criteria yet — add one below.</p>
        }
        <ul class="vault-item-delivery-block__edit-list">
          @for (ac of criteria(); track $index; let i = $index) {
            <li class="vault-item-delivery-block__edit-row">
              <input
                type="checkbox"
                class="vault-item-delivery-block__check"
                [checked]="ac.done"
                (change)="toggle(i)"
              />
              @if (editingIndex() === i) {
                <input
                  #editInput
                  type="text"
                  class="vault-item-delivery-block__edit-input"
                  [value]="draft()"
                  (input)="onDraftInput($event)"
                  (keydown)="onDraftKey($event, i)"
                  (blur)="commitEdit(i)"
                />
              } @else {
                <span
                  class="vault-item-delivery-block__edit-text"
                  [class.vault-item-delivery-block__edit-text--done]="ac.done"
                  role="button"
                  tabindex="0"
                  (click)="startEdit(i)"
                  (keydown.enter)="startEdit(i)"
                >{{ ac.text }}</span>
              }
              <button
                type="button"
                class="vault-item-delivery-block__remove"
                [attr.aria-label]="'Remove criterion'"
                (click)="remove(i)"
              >×</button>
            </li>
          }
        </ul>
        <input
          #addInput
          type="text"
          class="vault-item-delivery-block__add"
          [value]="addDraft()"
          placeholder="+ add criterion (Enter)"
          (input)="onAddInput($event)"
          (keydown)="onAddKey($event)"
        />
      } @else if (criteria().length > 0) {
        <app-ui-checklist [items]="checklistItems()" />
      } @else {
        <div class="vault-item-delivery-block__empty">No acceptance criteria yet — blocks readiness</div>
      }
    </app-ui-subsection>
  `,
  styles: [`
    :host {
      display: block;
      min-width: 0;
    }

    .vault-item-delivery-block__empty {
      padding: 0.4rem 0.6rem;
      background: #fbe7e7;
      border: 1px dashed #a33;
      color: #a33;
      font-size: 0.7rem;
    }

    .vault-item-delivery-block__empty-soft {
      color: var(--color-text-muted);
      font-size: 0.72rem;
      margin: 0 0 0.3rem;
    }

    .vault-item-delivery-block__edit-list {
      list-style: none;
      padding: 0;
      margin: 0 0 0.4rem;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .vault-item-delivery-block__edit-row {
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .vault-item-delivery-block__check { flex-shrink: 0; }

    .vault-item-delivery-block__edit-text {
      flex: 1;
      font-size: 0.78rem;
      cursor: text;
      padding: 0.1rem 0.3rem;
      border-radius: var(--radius);

      &:hover { background: color-mix(in srgb, var(--color-accent) 8%, transparent); }
      &:focus-visible {
        outline: 2px solid var(--color-accent);
        outline-offset: 1px;
      }
    }

    .vault-item-delivery-block__edit-text--done {
      text-decoration: line-through;
      color: var(--color-text-muted);
    }

    .vault-item-delivery-block__edit-input {
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

    .vault-item-delivery-block__remove {
      padding: 0 0.4rem;
      background: transparent;
      border: none;
      cursor: pointer;
      color: var(--color-text-muted);
      font-size: 0.85rem;
      line-height: 1;

      &:hover { color: var(--color-danger); }
    }

    .vault-item-delivery-block__add {
      width: 100%;
      box-sizing: border-box;
      padding: 0.3rem 0.5rem;
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
export class VaultItemDeliveryBlock {
  readonly readiness = input<UiReadinessData | undefined>(undefined);
  readonly criteria = input.required<readonly AcceptanceCriterion[]>();
  readonly editable = input<boolean>(false);
  readonly criteriaChange = output<readonly AcceptanceCriterion[]>();

  protected readonly editingIndex = signal<number | null>(null);
  protected readonly draft = signal('');
  protected readonly addDraft = signal('');
  private readonly editRef = viewChild<ElementRef<HTMLInputElement>>('editInput');
  private readonly addRef = viewChild<ElementRef<HTMLInputElement>>('addInput');

  constructor() {
    // Reset edit state when the bound criteria array changes (dialog swap).
    effect(() => {
      this.criteria();
      this.editingIndex.set(null);
    });
  }

  readonly checklistItems = computed<readonly UiChecklistItem[]>(() =>
    this.criteria().map(ac => {
      const status = acceptanceCriterionStatus(ac.text);
      if (status === 'verbose') {
        return {
          text: ac.text,
          done: ac.done,
          status: { label: 'verbose', tone: 'warn', title: `Verbose (${ac.text.length} chars). Spec recommends ≤ 120.` },
        };
      }
      if (status === 'exceeds') {
        return {
          text: ac.text,
          done: ac.done,
          status: { label: 'exceeds', tone: 'err', title: `Exceeds policy (${ac.text.length} chars). Reject or edit.` },
        };
      }
      return { text: ac.text, done: ac.done };
    })
  );

  protected toggle(i: number): void {
    const next = this.criteria().map((ac, idx) => idx === i ? { ...ac, done: !ac.done } : ac);
    this.criteriaChange.emit(next);
  }

  protected startEdit(i: number): void {
    this.draft.set(this.criteria()[i]?.text ?? '');
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
    if (e.key === 'Enter') { e.preventDefault(); this.commitEdit(i); }
    else if (e.key === 'Escape') { e.preventDefault(); this.cancelEdit(); }
  }

  protected commitEdit(i: number): void {
    if (this.editingIndex() !== i) return;
    const next = this.draft().trim();
    this.editingIndex.set(null);
    if (!next) { this.remove(i); return; }
    if (next === this.criteria()[i]?.text) return;
    this.criteriaChange.emit(this.criteria().map((ac, idx) => idx === i ? { ...ac, text: next } : ac));
  }

  private cancelEdit(): void {
    this.editingIndex.set(null);
    this.draft.set('');
  }

  protected remove(i: number): void {
    this.criteriaChange.emit(this.criteria().filter((_, idx) => idx !== i));
  }

  protected onAddInput(e: Event): void {
    this.addDraft.set((e.target as HTMLInputElement).value);
  }

  protected onAddKey(e: KeyboardEvent): void {
    if (e.key === 'Enter') {
      e.preventDefault();
      const text = this.addDraft().trim();
      if (!text) return;
      this.criteriaChange.emit([...this.criteria(), { text, done: false }]);
      this.addDraft.set('');
      queueMicrotask(() => this.addRef()?.nativeElement.focus());
    } else if (e.key === 'Escape') {
      this.addDraft.set('');
    }
  }
}
