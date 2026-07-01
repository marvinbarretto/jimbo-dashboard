import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { ReactiveFormsModule, FormControl, Validators } from '@angular/forms';
import { SmartComposerInput } from '@shared/components/smart-composer-input/smart-composer-input';

@Component({
  selector: 'app-clarification-answer-composer',
  imports: [ReactiveFormsModule, SmartComposerInput],
  templateUrl: './clarification-answer-composer.html',
  styleUrl: './clarification-answer-composer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClarificationAnswerComposer {
  readonly posted = output<string>();

  readonly answerControl = new FormControl('', { nonNullable: true, validators: [Validators.required] });

  submit(): void {
    const value = this.answerControl.value.trim();
    if (!this.answerControl.valid || !value) return;
    this.posted.emit(value);
    this.answerControl.reset('');
  }
}
