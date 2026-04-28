import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toast-stack',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toast-stack" role="log" aria-live="polite" aria-atomic="false">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="toast toast--{{ toast.tone }}" role="status">
          <span class="toast__message">{{ toast.message }}</span>
          <button class="toast__dismiss" type="button" (click)="toastService.dismiss(toast.id)" aria-label="Dismiss">×</button>
        </div>
      }
    </div>
  `,
  styleUrl: './toast-stack.scss',
})
export class ToastStack {
  protected readonly toastService = inject(ToastService);
}
