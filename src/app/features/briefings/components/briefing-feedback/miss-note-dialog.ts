import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ModalShell } from '@shared/components/modal-shell/modal-shell';
import { UiButton } from '@shared/components/ui-button/ui-button';
import { UiFormActions } from '@shared/components/ui-form-actions/ui-form-actions';

export interface MissNoteDialogData {
  /** Existing note to prefill, when re-pressing an already-missed item. */
  note: string | null;
}

// Opened after a ▼ miss press. The miss itself is already recorded — this only
// collects the optional "why", which the briefing skill reads back as explicit
// guidance. Closes with the note string, or undefined when skipped.
@Component({
  selector: 'app-miss-note-dialog',
  imports: [ReactiveFormsModule, ModalShell, UiButton, UiFormActions],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal-shell [titleId]="titleId" closeLabel="Skip" (close)="skip()">
      <h2 modal-header [id]="titleId" class="miss-note__title">Miss — teach the briefing</h2>

      <form modal-body class="miss-note__form" (ngSubmit)="save()">
        <label for="miss-note-text">What's off — and what would you rather see?</label>
        <textarea
          id="miss-note-text"
          rows="4"
          [formControl]="note"
          placeholder="Optional — a plain miss still counts. A sentence of why teaches far more."
        ></textarea>

        <app-ui-form-actions>
          <app-ui-button type="submit" variant="primary">Save</app-ui-button>
          <app-ui-button variant="ghost" (pressed)="skip()">Skip</app-ui-button>
        </app-ui-form-actions>
      </form>
    </app-modal-shell>
  `,
  styles: [`
    .miss-note__title {
      margin: 0;
      font-size: 0.95rem;
    }

    .miss-note__form {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 1rem 1.25rem 1.25rem;

      label {
        font-size: 0.78rem;
        color: var(--color-text-muted);
      }

      textarea {
        resize: vertical;
        font: inherit;
        font-size: 0.85rem;
      }
    }
  `],
})
export class MissNoteDialog {
  private readonly dialogRef = inject<DialogRef<string | undefined>>(DialogRef);
  private readonly data = inject<MissNoteDialogData>(DIALOG_DATA, { optional: true }) ?? { note: null };

  readonly titleId = 'miss-note-dialog-title';
  readonly note = new FormControl(this.data.note ?? '', { nonNullable: true });

  save(): void { this.dialogRef.close(this.note.value); }
  skip(): void { this.dialogRef.close(undefined); }
}
