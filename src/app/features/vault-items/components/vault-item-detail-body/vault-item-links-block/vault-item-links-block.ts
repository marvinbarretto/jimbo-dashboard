import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { UiButton } from '@shared/components/ui-button/ui-button';
import { UiChipList, type UiChipListItem } from '@shared/components/ui-chip-list/ui-chip-list';
import { UiSubhead } from '@shared/components/ui-subhead/ui-subhead';
import { UiSubsection } from '@shared/components/ui-subsection/ui-subsection';
import { VaultItemTagList } from '../vault-item-tag-list/vault-item-tag-list';
import type { OpenBlocker } from '@domain/vault/readiness';

export interface VaultItemSubtask {
  readonly id: string;
  readonly seq: number;
  readonly title: string;
  readonly grooming_status: string;
}

/**
 * The detail sidebar's Links panel: children, blockers, tags.
 *
 * Parent and project deliberately live only in the hierarchy bands at the top
 * of the detail view — repeating them here was the same fact twice, and an item
 * inherits its project from its parent rather than being filed by hand.
 */
@Component({
  selector: 'app-vault-item-links-block',
  imports: [UiButton, UiChipList, UiSubhead, UiSubsection, VaultItemTagList],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-ui-subsection label="Links">
      @if (subtasks().length > 0) {
        <!-- Children of an epic are first-class tasks, not subtasks; a plain
             task's children remain subtasks. Label follows the parent's role. -->
        <app-ui-subhead [label]="parentIsEpic() ? 'Tasks' : 'Subtasks'" [count]="subtasks().length" />
        <app-ui-chip-list
          [items]="subtaskChips()"
          [pickerOptions]="[]"
          [allowRemove]="false"
          emptyLabel="no subtasks"
          (itemClicked)="onSubtaskClicked($event)"
        />
      }

      <app-ui-subhead label="Blocked by" [count]="openBlockers().length" />
      <app-ui-chip-list
        [items]="blockerChips()"
        [pickerOptions]="[]"
        emptyLabel="no blockers"
        [alwaysShowAdd]="false"
        (itemClicked)="onBlockerClicked($event)"
        (removed)="blockerRemoved.emit($event)"
      />
      <div class="vault-item-links-block__blocker-add">
        <label for="blocker-seq-input" class="visually-hidden">Add blocker by seq number</label>
        <input id="blocker-seq-input"
          type="number" min="1"
          placeholder="seq # e.g. 1820"
          class="vault-item-links-block__blocker-input"
          [value]="addBlockerSeqInput()"
          (input)="onBlockerSeqInput($event)" />
        <app-ui-button
          variant="ghost"
          size="sm"
          [disabled]="!addBlockerSeqInput()"
          (pressed)="blockerAddBySeq.emit()">+ add blocker</app-ui-button>
      </div>

      <app-ui-subhead label="Tags" [count]="tags().length" />
      <app-vault-item-tag-list
        [tags]="tags()"
        [editable]="editable()"
        (tagsChange)="tagsChange.emit($event)"
      />
    </app-ui-subsection>
  `,
  styles: [`
    :host {
      display: block;
      min-width: 0;
    }

    .vault-item-links-block__blocker-add {
      display: flex;
      gap: 0.5rem;
      align-items: center;
      margin-top: 0.5rem;
      min-width: 0;
    }

    .vault-item-links-block__blocker-input {
      flex: 1;
      min-width: 0;
      padding: 0.2rem 0.45rem;
      font: inherit;
      font-size: 0.72rem;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      color: var(--color-text);
      border-radius: var(--radius, 4px);

      &::placeholder { color: var(--color-text-muted); opacity: 0.6; }
      &:focus { outline: none; border-color: var(--color-accent); }
    }

  `],
})
export class VaultItemLinksBlock {
  readonly subtasks = input.required<readonly VaultItemSubtask[]>();
  readonly openBlockers = input.required<readonly OpenBlocker[]>();
  readonly tags = input.required<readonly string[]>();
  readonly addBlockerSeqInput = input.required<string>();
  readonly editable = input<boolean>(false);
  /** When the current item is an epic, its children are labelled "Tasks" rather
   *  than "Subtasks" — see template. */
  readonly parentIsEpic = input<boolean>(false);

  readonly subtaskClicked = output<number>();
  readonly blockerClicked = output<number>();
  readonly blockerRemoved = output<string>();
  readonly blockerAddBySeq = output<void>();
  readonly blockerSeqInputChange = output<string>();
  readonly tagsChange = output<readonly string[]>();

  readonly subtaskChips = computed<readonly UiChipListItem[]>(() =>
    this.subtasks().map(c => ({
      id: c.id,
      label: c.title,
      seq: c.seq,
      entityType: 'vault-item' as const,
    }))
  );

  readonly blockerChips = computed<readonly UiChipListItem[]>(() =>
    this.openBlockers().map(b => ({
      id: b.blocker_id,
      label: b.blocker_title,
      seq: b.blocker_seq,
      entityType: 'vault-item' as const,
    }))
  );

  onSubtaskClicked(subtaskId: string): void {
    const child = this.subtasks().find(c => c.id === subtaskId);
    if (child) this.subtaskClicked.emit(child.seq);
  }

  onBlockerClicked(blockerId: string): void {
    const blocker = this.openBlockers().find(b => b.blocker_id === blockerId);
    if (blocker) {
      this.blockerClicked.emit(blocker.blocker_seq);
    }
  }

  onBlockerSeqInput(event: Event): void {
    this.blockerSeqInputChange.emit((event.target as HTMLInputElement).value);
  }
}
