import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import type { EvidenceStance } from '@domain/interrogate';

export interface BeliefFeedback {
  stance: EvidenceStance;
  snippet?: string;
}

@Component({
  selector: 'app-belief-feedback-composer',
  imports: [ReactiveFormsModule],
  templateUrl: './belief-feedback-composer.html',
  styleUrl: './belief-feedback-composer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BeliefFeedbackComposer {
  readonly feedback = output<BeliefFeedback>();

  readonly commentControl = new FormControl('', { nonNullable: true });

  submit(stance: EvidenceStance): void {
    const snippet = this.commentControl.value.trim();
    this.feedback.emit({ stance, snippet: snippet || undefined });
    this.commentControl.reset('');
  }
}
