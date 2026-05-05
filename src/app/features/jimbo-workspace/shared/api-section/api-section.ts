// Self-contained API panel for the workspace dump pages.
// Wraps an HTTP observable with loading/error/ok states and projects the
// successful response into a caller-supplied template.

import { ChangeDetectionStrategy, Component, contentChild, input, TemplateRef } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Observable, catchError, map, of, startWith, switchMap } from 'rxjs';

// Non-discriminated on purpose so the Angular template type-checker can
// access `data` / `error` without narrowing across separate state() calls.
interface State<T> {
  readonly status: 'loading' | 'ok' | 'error';
  readonly data?: T;
  readonly error?: string;
}

@Component({
  selector: 'app-api-section',
  imports: [NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="api-section">
      <h2 class="api-section__title">{{ title() }}</h2>
      @switch (state().status) {
        @case ('loading') { <p class="api-section__hint">Loading…</p> }
        @case ('error')   { <pre class="api-section__error">{{ state().error }}</pre> }
        @case ('ok')      {
          <ng-container *ngTemplateOutlet="bodyTpl(); context: { $implicit: state().data }" />
        }
      }
    </section>
  `,
  styles: [`
    :host { display: block; }
    .api-section__title {
      margin: 0 0 0.5rem;
      font-size: 0.78rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-text-muted);
      font-family: var(--font-mono, monospace);
    }
    .api-section__hint { font-size: 0.85rem; color: var(--color-text-muted); margin: 0; }
    .api-section__error {
      padding: 0.75rem;
      background: color-mix(in srgb, var(--color-danger) 8%, transparent);
      border: 1px solid color-mix(in srgb, var(--color-danger) 30%, var(--color-border));
      border-radius: var(--radius);
      font-size: 0.78rem;
      white-space: pre-wrap;
      color: var(--color-danger);
      margin: 0;
    }
  `],
})
export class ApiSection<T = unknown> {
  readonly title = input.required<string>();
  readonly source = input.required<Observable<T>>();
  protected readonly bodyTpl = contentChild.required<TemplateRef<{ $implicit: T }>>(TemplateRef);

  protected readonly state = toSignal(
    toObservable(this.source).pipe(
      switchMap(src => src.pipe(
        map((data): State<T> => ({ status: 'ok', data })),
        startWith<State<T>>({ status: 'loading' }),
        catchError((err: unknown) => of<State<T>>({ status: 'error', error: extractMessage(err) })),
      )),
    ),
    { initialValue: { status: 'loading' } as State<T> },
  );
}

function extractMessage(err: unknown): string {
  const e = err as { error?: { error?: { message?: string } }; message?: string; status?: number };
  return e?.error?.error?.message ?? e?.message ?? `HTTP ${e?.status ?? '?'}`;
}
