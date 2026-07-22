import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService, type Toast } from './toast.service';

@Component({
  selector: 'app-toast-stack',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toast-stack" role="log" aria-live="polite" aria-atomic="false">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="toast toast--{{ toast.tone }}" role="status">
          <span class="toast__message">{{ toast.message }}</span>
          @if (toast.count > 1) {
            <span class="toast__count" aria-label="repeated">×{{ toast.count }}</span>
          }
          @if (toast.action; as action) {
            <button class="toast__action" type="button" (click)="runAction(toast)">{{ action.label }}</button>
          }
          <button class="toast__dismiss" type="button" (click)="toastService.dismiss(toast.id)" aria-label="Dismiss">×</button>
        </div>
      }
    </div>
  `,
  styleUrl: './toast-stack.scss',
})
export class ToastStack {
  protected readonly toastService = inject(ToastService);

  // Dismissed before the callback runs, so an action that pushes its own
  // toast doesn't land underneath the one that triggered it.
  protected runAction(toast: Toast): void {
    this.toastService.dismiss(toast.id);
    toast.action?.run();
  }
}
