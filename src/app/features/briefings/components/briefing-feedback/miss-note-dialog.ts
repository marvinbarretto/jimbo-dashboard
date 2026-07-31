import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ModalShell } from '@shared/components/modal-shell/modal-shell';
import { UiButton } from '@shared/components/ui-button/ui-button';
import { UiFormActions } from '@shared/components/ui-form-actions/ui-form-actions';

export interface MissNoteDialogData {
  /** Existing note to prefill, when re-pressing an already-missed item. */
  note: string | null;
}

// One-tap reason categories. The tag is stored as a `[tag]` prefix on the
// feedback note so the briefing skill can aggregate reasons across briefings
// without interpreting prose.
export const MISS_REASONS = [
  { tag: 'wrong-facts', label: 'wrong facts' },
  { tag: 'stale', label: 'stale — already handled' },
  { tag: 'dont-care', label: "don't care about this" },
  { tag: 'too-much', label: 'too much detail' },
  { tag: 'wrong-framing', label: 'wrong framing' },
] as const;

export type MissReasonTag = (typeof MISS_REASONS)[number]['tag'];

const NOTE_PREFIX = /^\[([a-z-]+)\]\s*(.*)$/s;

/** Compose/split the `[tag] free text` note encoding. */
export function composeMissNote(reason: MissReasonTag, text: string): string {
  return `[${reason}] ${text.trim()}`.trim();
}

function parseMissNote(note: string | null): { reason: MissReasonTag | null; text: string } {
  const m = note?.match(NOTE_PREFIX);
  const known = MISS_REASONS.find((r) => r.tag === m?.[1]);
  if (m && known) return { reason: known.tag, text: m[2] };
  return { reason: null, text: note ?? '' };
}

// Opened on a ▼ miss press — the miss is only recorded when this saves, so
// every miss carries a steer. A reason chip is required (one tap); free text
// is optional richness on top. Closes with the composed note, or undefined
// when cancelled (nothing recorded).
@Component({
  selector: 'app-miss-note-dialog',
  imports: [ReactiveFormsModule, ModalShell, UiButton, UiFormActions],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal-shell [titleId]="titleId" closeLabel="Cancel" (close)="cancel()">
      <h2 modal-header [id]="titleId" class="miss-note__title">Miss — teach the briefing</h2>

      <form modal-body class="miss-note__form" [formGroup]="form" (ngSubmit)="save()">
        <div class="miss-note__chips" role="radiogroup" aria-label="Why is this a miss?">
          @for (r of reasons; track r.tag) {
            <button type="button" class="miss-note__chip"
              [class.miss-note__chip--selected]="reason() === r.tag"
              [attr.aria-pressed]="reason() === r.tag"
              (click)="pick(r.tag)">{{ r.label }}</button>
          }
        </div>
        @if (showReasonError()) {
          <p class="miss-note__error" role="alert">Pick a reason — that's the steer.</p>
        }

        <textarea
          id="miss-note-text"
          rows="3"
          formControlName="note"
          placeholder="Optional detail — what would you rather see?"
        ></textarea>

        <app-ui-form-actions>
          <app-ui-button type="submit" variant="primary">Record miss</app-ui-button>
          <app-ui-button variant="ghost" (pressed)="cancel()">Cancel</app-ui-button>
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
      gap: 0.6rem;
      padding: 1rem 1.25rem 1.25rem;

      textarea {
        resize: vertical;
        font: inherit;
        font-size: 0.85rem;
      }
    }

    .miss-note__chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
    }

    .miss-note__chip {
      border: 1px solid var(--color-border);
      border-radius: 999px;
      background: none;
      color: var(--color-text-muted);
      font: inherit;
      font-size: 0.78rem;
      padding: 0.2rem 0.7rem;
      cursor: pointer;

      &:hover { color: var(--color-text); }

      &--selected {
        border-color: var(--color-danger);
        color: var(--color-danger);
      }
    }

    .miss-note__error {
      margin: 0;
      font-size: 0.72rem;
      color: var(--color-danger);
    }
  `],
})
export class MissNoteDialog {
  private readonly dialogRef = inject<DialogRef<string | undefined>>(DialogRef);
  private readonly data = inject<MissNoteDialogData>(DIALOG_DATA, { optional: true }) ?? { note: null };

  readonly titleId = 'miss-note-dialog-title';
  readonly reasons = MISS_REASONS;

  private readonly parsed = parseMissNote(this.data.note);
  readonly reason = signal<MissReasonTag | null>(this.parsed.reason);
  // [formGroup], not a bare [formControl] — FormGroupDirective is what claims
  // the form's native submit and prevent-defaults it. Without a directive on
  // the <form>, (ngSubmit) is a listener for an event nothing raises, the
  // browser submits natively, and the page reloads before the dialog can
  // close: every miss silently lost. Same fix as answer-rail.
  readonly form = new FormGroup({
    note: new FormControl(this.parsed.text, { nonNullable: true }),
  });
  readonly showReasonError = signal(false);

  pick(tag: MissReasonTag): void {
    this.reason.set(tag);
    this.showReasonError.set(false);
  }

  save(): void {
    const reason = this.reason();
    if (!reason) {
      this.showReasonError.set(true);
      return;
    }
    this.dialogRef.close(composeMissNote(reason, this.form.controls.note.value));
  }

  cancel(): void { this.dialogRef.close(undefined); }
}
