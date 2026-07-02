import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { UiChecklist, type UiChecklistItem } from '@shared/components/ui-checklist/ui-checklist';
import { UiReadinessPanel, type UiReadinessData } from '@shared/components/ui-readiness-panel/ui-readiness-panel';
import { UiSubhead } from '@shared/components/ui-subhead/ui-subhead';
import { UiSubsection } from '@shared/components/ui-subsection/ui-subsection';
import type { AcceptanceCriterion } from '@domain/vault/vault-item';
import { acceptanceCriterionStatus } from '@shared/validation/acceptance-criterion-length';

// Delivery panel for a vault item. Composes four shared primitives:
//   ui-subsection      → labelled wrapper
//   ui-readiness-panel → "X/Y checks passed" with per-check rows
//   ui-subhead         → "Acceptance criteria · 3"
//   ui-checklist       → the AC list (read OR editable mode — same primitive)
//
// API serializer caveat: the wire format currently flattens AC to newline-joined
// text and drops `done` on round-trip. Toggling `done` is locally reactive but
// won't survive a page reload until the API gains structured AC.
@Component({
  selector: 'app-vault-item-delivery-block',
  imports: [UiChecklist, UiReadinessPanel, UiSubhead, UiSubsection],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-ui-subsection label="Delivery">
      @if (readiness(); as r) {
        <app-ui-readiness-panel [data]="r" />
      }

      @if (groomingOverridable()) {
        <button
          type="button"
          class="vault-item-delivery-block__grooming-override"
          (click)="groomingOverrideChange.emit(!groomingOverride())">
          {{ groomingOverride() ? 'Undo manual override' : "Not groomed — mark good enough for me" }}
        </button>
      }

      <app-ui-subhead label="Acceptance criteria" [count]="criteria().length" />

      @if (editable() || criteria().length > 0) {
        <app-ui-checklist
          [items]="checklistItems()"
          [editable]="editable()"
          appendPlaceholder="+ add criterion (Enter)"
          (toggled)="onToggle($event)"
          (edited)="onEdit($event)"
          (removed)="onRemove($event)"
          (appended)="onAppend($event)"
        />
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
      background: color-mix(in srgb, var(--color-danger) 8%, var(--color-surface));
      border: 1px dashed var(--color-danger);
      color: var(--color-danger);
      font-size: 0.7rem;
    }

    .vault-item-delivery-block__grooming-override {
      display: inline-flex;
      margin: -0.3rem 0 0.8rem;
      padding: 0.15rem 0.5rem;
      font-size: 0.68rem;
      font-weight: 600;
      letter-spacing: 0.02em;
      border: 1px dashed var(--color-border);
      border-radius: var(--radius);
      background: none;
      color: var(--color-text-muted);
      cursor: pointer;

      &:hover {
        border-color: var(--color-accent);
        color: var(--color-accent);
      }
    }
  `],
})
export class VaultItemDeliveryBlock {
  readonly readiness      = input<UiReadinessData | undefined>(undefined);
  readonly criteria       = input.required<readonly AcceptanceCriterion[]>();
  readonly editable       = input<boolean>(false);
  readonly criteriaChange = output<readonly AcceptanceCriterion[]>();

  // Human-owner readiness override — see readiness.ts. groomingOverridable
  // gates visibility (only shown while genuinely ungroomed and human-owned);
  // groomingOverride reflects the item's current flag.
  readonly groomingOverridable   = input<boolean>(false);
  readonly groomingOverride      = input<boolean>(false);
  readonly groomingOverrideChange = output<boolean>();

  readonly checklistItems = computed<readonly UiChecklistItem[]>(() =>
    this.criteria().map(ac => {
      const status = acceptanceCriterionStatus(ac.text);
      if (status === 'verbose') {
        return { text: ac.text, done: ac.done, status: { label: 'verbose', tone: 'warn', title: `Verbose (${ac.text.length} chars). Spec recommends ≤ 120.` } };
      }
      if (status === 'exceeds') {
        return { text: ac.text, done: ac.done, status: { label: 'exceeds', tone: 'err', title: `Exceeds policy (${ac.text.length} chars). Reject or edit.` } };
      }
      return { text: ac.text, done: ac.done };
    })
  );

  protected onToggle(i: number): void {
    this.criteriaChange.emit(this.criteria().map((ac, idx) => idx === i ? { ...ac, done: !ac.done } : ac));
  }

  protected onEdit({ index, text }: { index: number; text: string }): void {
    this.criteriaChange.emit(this.criteria().map((ac, idx) => idx === index ? { ...ac, text } : ac));
  }

  protected onRemove(i: number): void {
    this.criteriaChange.emit(this.criteria().filter((_, idx) => idx !== i));
  }

  protected onAppend(text: string): void {
    this.criteriaChange.emit([...this.criteria(), { text, done: false }]);
  }
}
