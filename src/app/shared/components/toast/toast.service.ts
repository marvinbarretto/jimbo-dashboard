import { Injectable, signal } from '@angular/core';

export type ToastTone = 'success' | 'error' | 'info' | 'warn';

export interface Toast {
  id: string;
  message: string;
  tone: ToastTone;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);

  success(message: string, ms = 3000): void { this.push(message, 'success', ms); }
  error(message: string, ms = 5000): void   { this.push(message, 'error', ms); }
  info(message: string, ms = 3000): void    { this.push(message, 'info', ms); }
  warn(message: string, ms = 4000): void    { this.push(message, 'warn', ms); }

  dismiss(id: string): void {
    this.toasts.update(ts => ts.filter(t => t.id !== id));
  }

  private push(message: string, tone: ToastTone, ms: number): void {
    const id = crypto.randomUUID();
    this.toasts.update(ts => [...ts, { id, message, tone }]);
    setTimeout(() => this.dismiss(id), ms);
  }
}
