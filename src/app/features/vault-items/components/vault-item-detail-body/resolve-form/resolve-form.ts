import { Component, ChangeDetectionStrategy, output, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

// Closing an item with a sentence about why it's fine now.
//
// The message is required, and that is the point of the component: a bare
// archive leaves the next reader unable to tell "done" from "abandoned", and
// the answer is only ever in the closer's head. Mirrors reject-form's shape so
// the two read as siblings — the difference is that reject hands work onward,
// resolve ends it.

@Component({
  selector: 'app-resolve-form',
  imports: [ReactiveFormsModule],
  templateUrl: './resolve-form.html',
  styleUrl: './resolve-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResolveFormComponent {
  private readonly fb = inject(FormBuilder);

  readonly cancelled = output<void>();
  readonly submitted = output<string>();

  readonly form = this.fb.nonNullable.group({
    // Same floor as reject-form: long enough to be a sentence, short enough
    // not to be a chore.
    message: ['', [Validators.required, Validators.minLength(12)]],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitted.emit(this.form.getRawValue().message.trim());
  }

  cancel(): void {
    this.cancelled.emit();
  }
}
