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
  readonly close = output<void>();

  onClose(): void { this.close.emit(); }
}
