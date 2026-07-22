import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { BriefingFeedbackService } from '../../data-access/briefing-feedback.service';

// The tiny +/− verdict control that sits beside any report item. Ghost-weight
// until used; a set verdict keeps its colour.
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
        title="miss — less like this" (click)="rate('miss')">▼</button>
    </span>
  `,
})
export class BriefingFeedback {
  private readonly feedback = inject(BriefingFeedbackService);

  readonly briefingId = input.required<number>();
  readonly section = input.required<string>();
  // null = verdict on the whole section rather than one item.
  readonly itemIndex = input<number | null>(null);

  protected readonly verdict = computed(() => {
    // Read the signal so verdicts refresh reactively.
    this.feedback.verdicts();
    return this.feedback.verdictFor(this.briefingId(), this.section(), this.itemIndex());
  });

  protected rate(verdict: 'hit' | 'miss'): void {
    void this.feedback.rate(this.briefingId(), this.section(), this.itemIndex(), verdict);
  }
}
