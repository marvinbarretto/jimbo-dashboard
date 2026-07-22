import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Dialog } from '@angular/cdk/dialog';
import { BriefingFeedbackService } from '../../data-access/briefing-feedback.service';
import { MissNoteDialog, type MissNoteDialogData } from './miss-note-dialog';

// The tiny +/− verdict control that sits beside any report item. Ghost-weight
// until used; a set verdict keeps its colour. ▲ records instantly; ▼ opens the
// reason dialog and only records on save — every miss carries a steer, and
// cancelling records nothing. Re-pressing ▼ reopens the dialog to edit.
@Component({
  selector: 'app-briefing-feedback',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="report-fb">
      <button type="button" class="report-fb__btn report-fb__btn--hit"
        [class.report-fb__btn--active]="verdict() === 'hit'"
        title="hit — more like this" (click)="rate('hit')">▲</button>
      <button type="button" class="report-fb__btn report-fb__btn--miss"
        [class.report-fb__btn--active]="verdict() === 'miss'"
        [class.report-fb__btn--noted]="note() !== null"
        [title]="missTitle()" (click)="rate('miss')">▼</button>
    </span>
  `,
})
export class BriefingFeedback {
  private readonly feedback = inject(BriefingFeedbackService);
  private readonly dialog = inject(Dialog);

  readonly briefingId = input.required<number>();
  readonly section = input.required<string>();
  // null = verdict on the whole section rather than one item.
  readonly itemIndex = input<number | null>(null);

  protected readonly verdict = computed(() => {
    // Read the signal so verdicts refresh reactively.
    this.feedback.entries();
    return this.feedback.verdictFor(this.briefingId(), this.section(), this.itemIndex());
  });

  protected readonly note = computed(() => {
    this.feedback.entries();
    return this.feedback.noteFor(this.briefingId(), this.section(), this.itemIndex());
  });

  protected readonly missTitle = computed(() => {
    const note = this.note();
    return note ? `miss — ${note}` : 'miss — less like this';
  });

  protected rate(verdict: 'hit' | 'miss'): void {
    if (verdict === 'miss') {
      this.openNoteDialog();
      return;
    }
    void this.feedback.rate(this.briefingId(), this.section(), this.itemIndex(), verdict);
  }

  private openNoteDialog(): void {
    const ref = this.dialog.open<string | undefined, MissNoteDialogData>(MissNoteDialog, {
      data: { note: this.note() },
      panelClass: 'miss-note-dialog',
      ariaModal: true,
      autoFocus: 'first-tabbable',
      restoreFocus: true,
      hasBackdrop: true,
    });
    ref.closed.subscribe((note) => {
      if (note !== undefined) {
        void this.feedback.rate(this.briefingId(), this.section(), this.itemIndex(), 'miss', note);
      }
    });
  }
}
