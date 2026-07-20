import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import { VaultItemDialogStore } from '../../../dialog/vault-item-dialog-store';
import { VaultItemDeliveryBlock } from '../vault-item-delivery-block/vault-item-delivery-block';
import { VaultItemIntakeBlock } from '../vault-item-intake-block/vault-item-intake-block';
import { VaultItemLinksBlock } from '../vault-item-links-block/vault-item-links-block';

/**
 * Body content for a dispatchable `type: 'task'` item — intake + delivery
 * (readiness/acceptance-criteria) + links. Reads/writes the shared
 * VaultItemDialogStore directly (same pattern as the shell) rather than
 * having ~15 inputs threaded through from the parent.
 *
 * Sibling: {@link VaultItemBodyCapture} for `note`/`bookmark`, which omits
 * the delivery block entirely — see the vault-item-detail audit that split
 * these (dispatch-readiness concepts don't apply to passive captures).
 */
@Component({
  selector: 'app-vault-item-body-task',
  imports: [VaultItemDeliveryBlock, VaultItemIntakeBlock, VaultItemLinksBlock],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (store.item(); as item) {
      <div class="vault-item-body-task__layout">
        <div class="vault-item-body-task__main">
          <app-vault-item-intake-block
            [body]="item.body"
            [createdAt]="item.created_at"
            [editable]="store.isManual()"
            (bodyChange)="store.updateBody($event)"
          />

          @if (!item.is_epic) {
            <div class="vault-item-body-task__estimate">
              <span class="vault-item-body-task__estimate-label">Estimate</span>
              <div class="vault-item-body-task__estimate-stepper">
                <button type="button" (click)="decEstimate()" [disabled]="estimateBlocks() <= 1" aria-label="decrease estimate">−</button>
                <span>{{ estimateBlocks() }}×25m</span>
                <button type="button" (click)="incEstimate()" aria-label="increase estimate">+</button>
              </div>
            </div>

            <app-vault-item-delivery-block
              [readiness]="store.readiness()"
              [criteria]="item.acceptance_criteria"
              [editable]="true"
              [groomingOverridable]="store.groomingOverridable()"
              [groomingOverride]="item.grooming_override"
              (criteriaChange)="store.updateCriteria($event)"
              (groomingOverrideChange)="store.setGroomingOverride($event)"
            />
          }
        </div>

        <aside class="vault-item-body-task__side">
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

    // Wide primary column (the work — intake + delivery) beside a narrower
    // side column (relationships + metadata). Same grid as the old shared
    // body-layout; duplicated (not shared) with the capture variant since
    // it's small and purely presentational.
    .vault-item-body-task__layout {
      display: grid;
      grid-template-columns: minmax(0, 1.7fr) minmax(0, 1fr);
      gap: 1.5rem;
      align-items: start;

      @media (max-width: 768px) {
        grid-template-columns: 1fr;
        gap: 1.25rem;
      }
    }

    .vault-item-body-task__main,
    .vault-item-body-task__side {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      min-width: 0;
    }

    // Effort estimate, in the planner's 25-minute pomodoro-block unit — set
    // here (detail modal) rather than on BlockCard/VaultCard's face, per the
    // "minimal card, rich detail on click" rule the planner cards follow.
    .vault-item-body-task__estimate {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      margin: -0.3rem 0 0;
    }
    .vault-item-body-task__estimate-label {
      font-size: 0.7rem;
      color: var(--color-text-muted);
    }
    .vault-item-body-task__estimate-stepper {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.75rem;
      font-family: var(--font-mono);
    }
    .vault-item-body-task__estimate-stepper button {
      width: 20px;
      height: 20px;
      padding: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      background: var(--color-surface);
      color: var(--color-text-soft);
      cursor: pointer;
    }
    .vault-item-body-task__estimate-stepper button:disabled {
      opacity: 0.4;
      cursor: default;
    }
    .vault-item-body-task__estimate-stepper button:not(:disabled):hover {
      border-color: var(--color-accent);
      color: var(--color-accent);
    }
  `],
})
export class VaultItemBodyTask {
  protected readonly store = inject(VaultItemDialogStore);

  // Navigation needs the shell's Router/surface-aware handlers (swapToSeq,
  // onProjectClicked) — everything else here calls store methods directly.
  readonly subtaskClicked = output<number>();
  readonly projectClicked = output<string>();
  readonly blockerClicked = output<number>();
  readonly parentClicked = output<number>();

  protected readonly estimateBlocks = computed(() => this.store.item()?.estimated_blocks ?? 1);

  protected incEstimate(): void {
    this.store.updateEstimatedBlocks(this.estimateBlocks() + 1);
  }

  protected decEstimate(): void {
    this.store.updateEstimatedBlocks(Math.max(1, this.estimateBlocks() - 1));
  }
}
