import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { VaultItemDialogStore } from '../../../dialog/vault-item-dialog-store';
import { VaultItemIntakeBlock } from '../vault-item-intake-block/vault-item-intake-block';
import { VaultItemLinksBlock } from '../vault-item-links-block/vault-item-links-block';

/**
 * Body content for a passive `type: 'note'` / `'bookmark'` capture — intake
 * + links only. No delivery block: acceptance criteria, grooming readiness,
 * and "ready to dispatch" are dispatch-pipeline concepts that don't apply to
 * something that will never be dispatched.
 *
 * Sibling: {@link VaultItemBodyTask} for `type: 'task'`, which adds the
 * delivery block back in.
 */
@Component({
  selector: 'app-vault-item-body-capture',
  imports: [VaultItemIntakeBlock, VaultItemLinksBlock],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (store.item(); as item) {
      <div class="vault-item-body-capture__layout">
        <div class="vault-item-body-capture__main">
          <app-vault-item-intake-block
            [body]="item.body"
            [createdAt]="item.created_at"
            [editable]="store.isManual()"
            (bodyChange)="store.updateBody($event)"
          />
        </div>

        <aside class="vault-item-body-capture__side">
          <app-vault-item-links-block
            [subtasks]="store.children()"
            [parentIsEpic]="item.is_epic"
            [projects]="store.projects()"
            [activeProjects]="store.activeProjects()"
            [openBlockers]="store.openBlockers()"
            [tags]="item.tags"
            [addBlockerSeqInput]="store.addBlockerSeqInput()"
            [availableEpics]="store.availableEpics()"
            [parent]="store.parentRef()"
            [editable]="true"
            (subtaskClicked)="subtaskClicked.emit($event)"
            (projectClicked)="projectClicked.emit($event)"
            (projectAdded)="store.addProject($event)"
            (projectRemoved)="store.removeProject($event)"
            (blockerClicked)="blockerClicked.emit($event)"
            (blockerRemoved)="store.removeBlocker($event)"
            (blockerAddBySeq)="store.addBlockerBySeq()"
            (blockerSeqInputChange)="store.addBlockerSeqInput.set($event)"
            (tagsChange)="store.updateTags($event)"
            (parentClicked)="parentClicked.emit($event)"
            (parentChange)="store.updateParent($event)"
          />
        </aside>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }

    .vault-item-body-capture__layout {
      display: grid;
      grid-template-columns: minmax(0, 1.7fr) minmax(0, 1fr);
      gap: 1.5rem;
      align-items: start;

      @media (max-width: 768px) {
        grid-template-columns: 1fr;
        gap: 1.25rem;
      }
    }

    .vault-item-body-capture__main,
    .vault-item-body-capture__side {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      min-width: 0;
    }
  `],
})
export class VaultItemBodyCapture {
  protected readonly store = inject(VaultItemDialogStore);

  readonly subtaskClicked = output<number>();
  readonly projectClicked = output<string>();
  readonly blockerClicked = output<number>();
  readonly parentClicked = output<number>();
}
