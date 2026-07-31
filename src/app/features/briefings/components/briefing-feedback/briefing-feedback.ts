import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Dialog } from '@angular/cdk/dialog';
import { BriefingFeedbackService } from '../../data-access/briefing-feedback.service';
import { MissNoteDialog, type MissNoteDialogData } from './miss-note-dialog';

// The tiny +/− verdict control that sits beside any report item. Ghost-weight
// until used; a set verdict keeps its colour. ▲ records instantly; ▼ opens the
// reason dialog and only records on save — every miss carries a steer, and
// cancelling records nothing.
//
// Tri-state: pressing the button that's already set clears the verdict. These
// verdicts steer what the briefing skill reshapes, so a mis-click that could
// only be overwritten (never un-said) kept feeding the generator an opinion
// Marvin never held. Clearing a miss drops its note with it — the note is the
// miss's reason and has nothing to qualify once the miss is gone.
@Component({
  selector: 'app-briefing-feedback',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="report-fb">
      <button type="button" class="report-fb__btn report-fb__btn--hit"
        [class.report-fb__btn--active]="verdict() === 'hit'"
        [title]="hitTitle()" (click)="rate('hit')">▲</button>
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

  // Titles say what the next press does, so "press again to clear" is
  // discoverable rather than something you have to find by accident.
  protected readonly hitTitle = computed(() =>
    this.verdict() === 'hit' ? 'hit — press again to clear' : 'hit — more like this');

  protected readonly missTitle = computed(() => {
    const note = this.note();
    if (this.verdict() === 'miss') {
      return note ? `miss — ${note} · press again to clear` : 'miss — press again to clear';
    }
    return 'miss — less like this';
  });

  protected rate(verdict: 'hit' | 'miss'): void {
    // Pressing what's already set un-says it. Checked before the dialog so a
    // second ▼ clears rather than reopening the reason form — one gesture per
    // button, same as ▲.
    if (this.verdict() === verdict) {
      void this.feedback.clear(this.briefingId(), this.section(), this.itemIndex());
      return;
    }
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
