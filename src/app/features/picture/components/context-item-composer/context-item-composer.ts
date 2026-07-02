import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { ReactiveFormsModule, FormControl, Validators } from '@angular/forms';

// Bare add-a-line composer for a context section — no label/timeframe/status
// fields, matching the punchy one-liner shape most section items already
// have. Those richer fields stay edit-only (see ContextItemRow) until
// there's a real need to set them at creation time.
@Component({
  selector: 'app-context-item-composer',
  imports: [ReactiveFormsModule],
  templateUrl: './context-item-composer.html',
  styleUrl: './context-item-composer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContextItemComposer {
  readonly added = output<string>();

  readonly control = new FormControl('', { nonNullable: true, validators: [Validators.required] });

  submit(): void {
    const value = this.control.value.trim();
    if (!value) return;
    this.added.emit(value);
    this.control.reset('');
  }
}
