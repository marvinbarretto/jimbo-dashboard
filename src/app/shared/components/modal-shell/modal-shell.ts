import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';

@Component({
  selector: 'app-modal-shell',
  templateUrl: './modal-shell.html',
  styleUrl: './modal-shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'role': 'dialog',
    'aria-modal': 'true',
    '[attr.aria-labelledby]': 'titleId()',
  },
})
export class ModalShell {
  readonly titleId = input<string | null>(null);
  readonly closeLabel = input<string>('Close');
  /** Set false to suppress the chrome header bar. The title slot is kept
   *  visually hidden so aria-labelledby still resolves. The close button
   *  floats in the top-right corner of the modal body instead. */
  readonly showHeader = input(true);
  readonly close = output<void>();

  onClose(): void { this.close.emit(); }
}
