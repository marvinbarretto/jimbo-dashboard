import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

// ── capture-input ─────────────────────────────────────────────────────────
//
// MVP quick-capture, mirrors the spirit of the old dashboard's `db-capture`:
// type a title → Enter to save, Tab to expose body. Embellishments deferred:
// `#tag !type p:N @owner` parser, autocomplete, search shortcut, flash anim.
// Posts directly to jimbo-api `/api/vault/notes`.

interface CaptureResponse {
  id: string;
  seq: number;
  title: string;
}

@Component({
  selector: 'app-capture-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="capture">
      <textarea
        #titleEl
        class="capture__title"
        [class.capture__title--flash]="flash()"
        [value]="title()"
        (input)="onTitleInput($event)"
        (keydown)="onTitleKey($event)"
        [placeholder]="flash() ? '' : 'capture... (tab for body, enter to save)'"
        [readonly]="submitting() || !!flash()"
        rows="1"></textarea>

      @if (showBody()) {
        <textarea
          #bodyEl
          class="capture__body"
          [value]="body()"
          (input)="onBodyInput($event)"
          (keydown)="onBodyKey($event)"
          (blur)="onBodyBlur()"
          placeholder="body... (enter saves, shift+enter newline)"
          rows="3"></textarea>
      }

      @if (flash(); as msg) {
        <span class="capture__flash">{{ msg }}</span>
      }
      @if (errorMsg(); as err) {
        <span class="capture__error">{{ err }}</span>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      padding: 0 0 0.9rem;
    }
    .capture {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      max-width: 40rem;
    }
    .capture__title,
    .capture__body {
      width: 100%;
      padding: 0.5rem 0.6rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      background: var(--color-bg-elevated, var(--color-bg));
      color: var(--color-text);
      font-family: inherit;
      font-size: 0.9rem;
      line-height: 1.4;
      resize: none;
      transition: border-color 0.12s, background 0.12s;

      &:focus {
        outline: none;
        border-color: var(--color-accent);
      }
      &:read-only { cursor: progress; opacity: 0.7; }
    }
    .capture__title { font-weight: 500; }
    .capture__title--flash {
      border-color: color-mix(in oklch, var(--color-accent) 60%, transparent);
      background: color-mix(in oklch, var(--color-accent) 12%, var(--color-bg));
    }
    .capture__flash {
      position: absolute;
      right: 0.6rem;
      top: 0.5rem;
      font-size: 0.7rem;
      color: var(--color-accent);
      pointer-events: none;
    }
    .capture__error {
      font-size: 0.7rem;
      color: var(--color-warning);
    }
  `],
})
export class CaptureInput {
  private readonly http = inject(HttpClient);
  private readonly titleRef = viewChild.required<ElementRef<HTMLTextAreaElement>>('titleEl');
  private readonly bodyRef = viewChild<ElementRef<HTMLTextAreaElement>>('bodyEl');

  protected readonly title = signal('');
  protected readonly body = signal('');
  protected readonly submitting = signal(false);
  protected readonly flash = signal<string | null>(null);
  protected readonly errorMsg = signal<string | null>(null);
  // Body field stays mounted whenever it has content; toggleable via Tab/Esc otherwise.
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
      // Wait for the textarea to render before focusing.
      queueMicrotask(() => this.bodyRef()?.nativeElement.focus());
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void this.submit();
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
      this.titleRef().nativeElement.focus();
      return;
    }
    if (e.key === 'Escape' && this.body().length === 0) {
      e.preventDefault();
      this.bodyExpanded.set(false);
      this.titleRef().nativeElement.focus();
    }
  }

  protected onBodyBlur(): void {
    if (this.body().length === 0) this.bodyExpanded.set(false);
  }

  private async submit(): Promise<void> {
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
          this.autoresize(this.titleRef().nativeElement, 160);
          // Clear the flash after a beat so the field is usable again.
          setTimeout(() => this.flash.set(null), 1200);
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
