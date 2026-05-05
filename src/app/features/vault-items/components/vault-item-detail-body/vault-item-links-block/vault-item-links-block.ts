import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { UiChipList, type UiChipListItem, type UiChipListPickerOption } from '@shared/components/ui-chip-list/ui-chip-list';
import { UiSubhead } from '@shared/components/ui-subhead/ui-subhead';
import { UiSubsection } from '@shared/components/ui-subsection/ui-subsection';
import { VaultItemTagList } from '../vault-item-tag-list/vault-item-tag-list';
import type { Project } from '@domain/projects/project';
import type { OpenBlocker } from '@domain/vault/readiness';

export interface VaultItemSubtask {
  readonly id: string;
  readonly seq: number;
  readonly title: string;
  readonly grooming_status: string;
}

export interface VaultItemParentRef {
  readonly seq: number;
  readonly title: string;
}

@Component({
  selector: 'app-vault-item-links-block',
  imports: [UiChipList, UiSubhead, UiSubsection, VaultItemTagList],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-ui-subsection label="Links">
      @if (subtasks().length > 0) {
        <app-ui-subhead label="Subtasks" [count]="subtasks().length" />
        <ul class="vault-item-links-block__subtasks">
          @for (child of subtasks(); track child.id) {
            <li>
              <button type="button"
                class="detail-link-badge detail-link-badge--subtask"
                (click)="subtaskClicked.emit(child.seq)">
                <span class="detail-link-badge__prefix">#{{ child.seq }}</span>
                {{ child.title }}
              </button>
            </li>
          }
        </ul>
      }

      @if (parent() || editable()) {
        <app-ui-subhead label="Parent" [count]="parent() ? 1 : 0" />
        @if (parent(); as p) {
          <div class="vault-item-links-block__parent-row">
            <button type="button"
              class="detail-link-badge detail-link-badge--subtask"
              (click)="parentClicked.emit(p.seq)">
              <span class="detail-link-badge__prefix">#{{ p.seq }}</span>
              {{ p.title }}
            </button>
            @if (editable()) {
              <button type="button"
                class="vault-item-links-block__inline-btn"
                aria-label="Remove parent"
                (click)="parentChange.emit(null)">× clear</button>
            }
          </div>
        } @else {
          <div class="vault-item-links-block__parent-add">
            <label for="parent-seq-input" class="visually-hidden">Set parent by seq number</label>
            <input id="parent-seq-input"
              type="number" min="1"
              placeholder="seq # e.g. 1820"
              class="vault-item-links-block__blocker-input"
              [value]="parentSeqDraft()"
              (input)="onParentSeqInput($event)"
              (keydown.enter)="commitParent()" />
            <button type="button"
              class="vault-item-links-block__inline-btn"
              [disabled]="!parentSeqDraft()"
              (click)="commitParent()">
              + set parent
            </button>
          </div>
        }
      }

      <app-ui-subhead label="Projects" [count]="projects().length" />
      <app-ui-chip-list
        [items]="projectChips()"
        [pickerOptions]="projectPickerOptions()"
        addLabel="+ add project"
        emptyLabel="no linked projects"
        (itemClicked)="projectClicked.emit($event)"
        (removed)="projectRemoved.emit($event)"
        (added)="projectAdded.emit($event)"
      />

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
        <button type="button"
          class="vault-item-links-block__inline-btn"
          [disabled]="!addBlockerSeqInput()"
          (click)="blockerAddBySeq.emit()">
          + add blocker
        </button>
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

    .vault-item-links-block__subtasks {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .vault-item-links-block__blocker-add,
    .vault-item-links-block__parent-add {
      display: flex;
      gap: 0.4rem;
      align-items: center;
      margin-top: 0.25rem;
    }

    .vault-item-links-block__parent-row {
      display: flex;
      gap: 0.4rem;
      align-items: center;
      flex-wrap: wrap;
      margin-bottom: 0.4rem;
    }

    .vault-item-links-block__blocker-input {
      width: 120px;
      padding: 2px 6px;
      font: inherit;
      font-size: 0.72rem;
      background: var(--color-bg);
      border: 1px solid var(--color-border);
      color: var(--color-text);
      border-radius: 3px;
    }

    .vault-item-links-block__blocker-input::placeholder {
      color: var(--color-text-muted);
      opacity: 0.6;
    }

    .vault-item-links-block__blocker-input:focus {
      outline: none;
      border-color: var(--color-accent);
    }

    .vault-item-links-block__inline-btn {
      padding: 2px 8px;
      background: transparent;
      border: 1px solid var(--color-border);
      border-radius: 3px;
      font: inherit;
      font-size: 0.7rem;
      cursor: pointer;
      color: var(--color-text-muted);
    }

    .vault-item-links-block__inline-btn:hover {
      border-color: var(--color-text);
      color: var(--color-text);
    }

    .vault-item-links-block__inline-btn:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }

  `],
})
export class VaultItemLinksBlock {
  readonly subtasks = input.required<readonly VaultItemSubtask[]>();
  readonly projects = input.required<readonly Project[]>();
  readonly activeProjects = input.required<readonly Project[]>();
  readonly openBlockers = input.required<readonly OpenBlocker[]>();
  readonly tags = input.required<readonly string[]>();
  readonly addBlockerSeqInput = input.required<string>();
  readonly parent = input<VaultItemParentRef | null>(null);
  readonly editable = input<boolean>(false);

  readonly subtaskClicked = output<number>();
  readonly projectClicked = output<string>();
  readonly projectAdded = output<string>();
  readonly projectRemoved = output<string>();
  readonly blockerClicked = output<number>();
  readonly blockerRemoved = output<string>();
  readonly blockerAddBySeq = output<void>();
  readonly blockerSeqInputChange = output<string>();
  readonly tagsChange = output<readonly string[]>();
  readonly parentClicked = output<number>();
  // null clears the parent. number is the seq the operator typed in; the parent
  // (detail-body) translates seq → vault-item id and persists.
  readonly parentChange = output<number | null>();

  readonly parentSeqDraft = signal('');

  readonly projectChips = computed<readonly UiChipListItem[]>(() =>
    this.projects().map(p => ({ id: p.id, label: p.display_name, entityType: 'project' as const }))
  );

  readonly projectPickerOptions = computed<readonly UiChipListPickerOption[]>(() =>
    this.activeProjects()
      .filter(p => !this.projects().some(linked => linked.id === p.id))
      .map(p => ({ id: p.id, label: p.display_name, entityType: 'project' as const }))
  );

  readonly blockerChips = computed<readonly UiChipListItem[]>(() =>
    this.openBlockers().map(b => ({
      id: b.blocker_id,
      label: b.blocker_title,
      seq: b.blocker_seq,
      entityType: 'vault-item' as const,
    }))
  );

  onBlockerClicked(blockerId: string): void {
    const blocker = this.openBlockers().find(b => b.blocker_id === blockerId);
    if (blocker) {
      this.blockerClicked.emit(blocker.blocker_seq);
    }
  }

  onBlockerSeqInput(event: Event): void {
    this.blockerSeqInputChange.emit((event.target as HTMLInputElement).value);
  }

  onParentSeqInput(event: Event): void {
    this.parentSeqDraft.set((event.target as HTMLInputElement).value);
  }

  commitParent(): void {
    const raw = this.parentSeqDraft().trim();
    if (!raw) return;
    const seq = Number(raw);
    if (!Number.isFinite(seq) || seq <= 0) return;
    this.parentChange.emit(seq);
    this.parentSeqDraft.set('');
  }
}
