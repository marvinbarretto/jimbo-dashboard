import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DialogRef } from '@angular/cdk/dialog';
import { environment } from '../../../environments/environment';

interface CaptureResponse {
  id: string;
  seq: number;
  title: string;
}

@Component({
  selector: 'app-capture-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Quick capture' },
  template: `
    <div class="capture-dialog">
      <header class="capture-dialog__header">
        <span class="capture-dialog__title">Quick capture</span>
        <kbd class="capture-dialog__hint">Tab for body · Enter to save · Esc to close</kbd>
      </header>

      <div class="capture-dialog__body">
        <textarea
          #titleEl
          class="capture-dialog__textarea capture-dialog__textarea--title"
          [class.capture-dialog__textarea--flash]="flash()"
          [value]="title()"
          (input)="onTitleInput($event)"
          (keydown)="onTitleKey($event)"
          placeholder="Title…"
          [readonly]="submitting() || !!flash()"
          rows="1"
          aria-label="Title"
        ></textarea>

        @if (showBody()) {
          <textarea
            #bodyEl
            class="capture-dialog__textarea capture-dialog__textarea--body"
            [value]="body()"
            (input)="onBodyInput($event)"
            (keydown)="onBodyKey($event)"
            (blur)="onBodyBlur()"
            placeholder="Body… (Shift+Enter for newline)"
            rows="4"
            aria-label="Body"
          ></textarea>
        }
      </div>

      <footer class="capture-dialog__footer">
        @if (flash(); as msg) {
          <span class="capture-dialog__flash">{{ msg }}</span>
        } @else if (errorMsg(); as err) {
          <span class="capture-dialog__error">{{ err }}</span>
        } @else {
          <span></span>
        }
        <button
          type="button"
          class="btn btn--primary btn--sm"
          [disabled]="!title().trim() || submitting()"
          (click)="submit()">
          {{ submitting() ? 'Saving…' : 'Save' }}
        </button>
      </footer>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      background: var(--color-bg);
      border: 1px solid var(--color-border);
      border-radius: calc(var(--radius) * 1.5);
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
      overflow: hidden;
    }

    .capture-dialog__header {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.6rem 1rem;
      border-bottom: 1px solid var(--color-border);
      background: var(--color-surface);
    }

    .capture-dialog__title {
      font-size: 0.78rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--color-text-muted);
    }

    .capture-dialog__hint {
      font-size: 0.7rem;
      color: var(--color-text-muted);
      background: none;
      border: none;
      font-family: inherit;
    }

    .capture-dialog__body {
      padding: 0.75rem 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .capture-dialog__textarea {
      width: 100%;
      padding: 0.4rem 0;
      border: none;
      outline: none;
      background: transparent;
      color: var(--color-text);
      font: inherit;
      resize: none;
      line-height: 1.5;

      &::placeholder { color: var(--color-text-muted); }
      &:read-only { opacity: 0.6; cursor: progress; }

      &--title {
        font-size: 1.05rem;
        font-weight: 500;
        border-bottom: 1px solid var(--color-border);
        padding-bottom: 0.5rem;
      }

      &--title.capture-dialog__textarea--flash {
        color: var(--color-accent);
      }

      &--body {
        font-size: 0.9rem;
        color: var(--color-text-muted);
      }
    }

    .capture-dialog__footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.6rem 1rem;
      border-top: 1px solid var(--color-border);
      background: var(--color-surface);
      gap: 1rem;
    }

    .capture-dialog__flash {
      font-size: 0.8rem;
      color: var(--color-accent);
    }

    .capture-dialog__error {
      font-size: 0.8rem;
      color: var(--color-danger, #ef4444);
    }
  `],
})
export class CaptureDialog {
  private readonly http = inject(HttpClient);
  private readonly dialogRef = inject(DialogRef);
  private readonly titleRef = viewChild<ElementRef<HTMLTextAreaElement>>('titleEl');
  private readonly bodyRef = viewChild<ElementRef<HTMLTextAreaElement>>('bodyEl');

  protected readonly title = signal('');
  protected readonly body = signal('');
  protected readonly submitting = signal(false);
  protected readonly flash = signal<string | null>(null);
  protected readonly errorMsg = signal<string | null>(null);
  private readonly bodyExpanded = signal(false);

  protected readonly showBody = () => this.bodyExpanded() || this.body().length > 0;

  protected onTitleInput(e: Event): void {
    this.title.set((e.target as HTMLTextAreaElement).value);
    this.autoresize(e.target as HTMLTextAreaElement, 160);
    this.errorMsg.set(null);
  }

  protected onBodyInput(e: Event): void {
    this.body.set((e.target as HTMLTextAreaElement).value);
    this.autoresize(e.target as HTMLTextAreaElement, 240);
  }

  protected onTitleKey(e: KeyboardEvent): void {
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      this.bodyExpanded.set(true);
      queueMicrotask(() => this.bodyRef()?.nativeElement.focus());
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void this.submit();
      return;
    }
    if (e.key === 'Escape') {
      this.dialogRef.close();
    }
  }

  protected onBodyKey(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void this.submit();
      return;
    }
    if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault();
      this.titleRef()?.nativeElement.focus();
      return;
    }
    if (e.key === 'Escape') {
      if (this.body().length === 0) {
        this.bodyExpanded.set(false);
        this.titleRef()?.nativeElement.focus();
      } else {
        this.dialogRef.close();
      }
    }
  }

  protected onBodyBlur(): void {
    if (this.body().length === 0) this.bodyExpanded.set(false);
  }

  protected async submit(): Promise<void> {
    const title = this.title().trim();
    if (!title || this.submitting()) return;

    this.submitting.set(true);
    this.errorMsg.set(null);
    const body = this.body().trim() || undefined;

    this.http
      .post<CaptureResponse>(`${environment.dashboardApiUrl}/api/vault/notes`, { title, body })
      .subscribe({
        next: (note) => {
          this.flash.set(`saved · #${note.seq}`);
          this.title.set('');
          this.body.set('');
          this.bodyExpanded.set(false);
          this.submitting.set(false);
          this.autoresize(this.titleRef()!.nativeElement, 160);
          setTimeout(() => this.dialogRef.close(), 1200);
        },
        error: (err) => {
          this.submitting.set(false);
          this.errorMsg.set(err?.error?.error?.message ?? err?.message ?? 'save failed');
        },
      });
  }

  private autoresize(el: HTMLTextAreaElement, max: number): void {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, max) + 'px';
  }
}
