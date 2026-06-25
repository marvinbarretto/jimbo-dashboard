import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';

export type UiInlineEditKind = 'text' | 'textarea' | 'select' | 'number' | 'datetime';

export interface UiInlineEditOption {
  readonly value: string;
  readonly label: string;
}

/**
 * Click-to-edit inline field. Read mode shows the current value; activating
 * (click / Enter / Space) flips to an `<input>`/`<textarea>`/`<select>` that
 * autofocuses and selects-all. Saves on blur or Enter; cancels on Escape.
 *
 * Why centralised: identity-header, hybrid-edit-section, links-block, and
 * the new vault-item dialog all rolled their own version. One primitive,
 * three render shapes.
 *
 * Inputs are signal-based; the host owns the canonical value and updates
 * it on `(saved)`. The component does not internally mutate after save —
 * if the host doesn't reflect the new value, the read-mode UI snaps back
 * to the prior canonical state. Trim policy is host-side.
 */
@Component({
  selector: 'app-ui-inline-edit',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (editing()) {
      @switch (kind()) {
        @case ('textarea') {
          <textarea
            #editEl
            class="ui-inline-edit__field ui-inline-edit__field--textarea"
            [class.ui-inline-edit__field--lg]="size() === 'lg'"
            [value]="draft()"
            [attr.aria-label]="ariaLabel()"
            [attr.rows]="rows()"
            (input)="onInput($any($event))"
            (keydown)="onKey($event)"
            (blur)="commit()"
          ></textarea>
        }
        @case ('select') {
          <select
            #editEl
            class="ui-inline-edit__field"
            [class.ui-inline-edit__field--lg]="size() === 'lg'"
            [value]="draft()"
            [attr.aria-label]="ariaLabel()"
            (change)="onInput($any($event))"
            (keydown)="onKey($event)"
            (blur)="commit()"
          >
            @for (opt of options(); track opt.value) {
              <option [value]="opt.value">{{ opt.label }}</option>
            }
          </select>
        }
        @case ('number') {
          <input
            #editEl
            type="number"
            inputmode="numeric"
            class="ui-inline-edit__field ui-inline-edit__field--number"
            [class.ui-inline-edit__field--lg]="size() === 'lg'"
            [value]="draft()"
            [attr.aria-label]="ariaLabel()"
            [attr.min]="min()"
            [attr.max]="max()"
            [attr.step]="step()"
            (input)="onInput($any($event))"
            (keydown)="onKey($event)"
            (blur)="commit()"
          />
        }
        @case ('datetime') {
          <input
            #editEl
            type="datetime-local"
            class="ui-inline-edit__field ui-inline-edit__field--datetime"
            [class.ui-inline-edit__field--lg]="size() === 'lg'"
            [value]="draft()"
            [attr.aria-label]="ariaLabel()"
            (input)="onInput($any($event))"
            (keydown)="onKey($event)"
            (blur)="commit()"
          />
        }
        @default {
          <input
            #editEl
            type="text"
            class="ui-inline-edit__field"
            [class.ui-inline-edit__field--lg]="size() === 'lg'"
            [value]="draft()"
            [attr.aria-label]="ariaLabel()"
            (input)="onInput($any($event))"
            (keydown)="onKey($event)"
            (blur)="commit()"
          />
        }
      }
    } @else {
      <button
        type="button"
        class="ui-inline-edit__display"
        [class.ui-inline-edit__display--lg]="size() === 'lg'"
        [class.ui-inline-edit__display--placeholder]="!displayValue()"
        [attr.aria-label]="ariaLabel() ?? 'Edit'"
        (click)="startEdit()"
      >
        {{ displayValue() || placeholder() }}
      </button>
    }
  `,
  styles: [`
    :host {
      display: inline-flex;
      flex: 1 1 auto;
      min-width: 0;
    }

    .ui-inline-edit__display,
    .ui-inline-edit__field {
      display: block;
      width: 100%;
      font: inherit;
      color: inherit;
      padding: 0.1rem 0.3rem;
      margin: -0.1rem -0.3rem;
      border-radius: var(--radius);
      text-align: left;
      min-width: 0;
    }

    .ui-inline-edit__display {
      cursor: pointer;
      background: transparent;
      border: 1px solid transparent;
      transition: background 0.1s ease, border-color 0.1s ease;

      /* Clear "click to edit" affordance: accent-tinted fill + border on hover. */
      &:hover {
        background: color-mix(in srgb, var(--color-accent) 14%, transparent);
        border-color: color-mix(in srgb, var(--color-accent) 50%, transparent);
      }

      &:focus-visible {
        outline: 2px solid var(--color-accent);
        outline-offset: 1px;
      }

      &--placeholder {
        color: var(--color-text-muted);
        font-style: italic;
      }

      &--lg {
        font-size: 1.02rem;
        font-weight: 650;
        letter-spacing: -0.01em;
      }
    }

    .ui-inline-edit__field {
      background: var(--color-bg-elevated, var(--color-bg));
      color: var(--color-text);
      border: 1px solid var(--color-accent);

      &:focus { outline: none; }

      &--lg {
        font-size: 1.02rem;
        font-weight: 650;
        letter-spacing: -0.01em;
      }

      &--textarea {
        resize: vertical;
        min-height: 2rem;
        line-height: 1.5;
      }

      &--number {
        font-variant-numeric: tabular-nums;
      }

      &--datetime {
        font-variant-numeric: tabular-nums;
        color-scheme: dark;
      }
    }
  `],
})
export class UiInlineEdit {
  readonly value = input.required<string>();
  readonly kind = input<UiInlineEditKind>('text');
  readonly size = input<'md' | 'lg'>('md');
  readonly placeholder = input<string>('');
  readonly ariaLabel = input<string | undefined>(undefined);
  readonly options = input<readonly UiInlineEditOption[]>([]);
  readonly rows = input<number>(2);

  // Number-kind constraints — forwarded to the native <input type="number">.
  readonly min = input<number | undefined>(undefined);
  readonly max = input<number | undefined>(undefined);
  readonly step = input<number | undefined>(undefined);

  /**
   * For select kind, lets the host map the raw value to a display label
   * (e.g. when the value is an id and the label is a display_name). Falls
   * back to the value itself for text/textarea.
   */
  readonly displayFor = input<((v: string) => string) | undefined>(undefined);

  readonly saved = output<string>();

  protected readonly editing = signal(false);
  protected readonly draft = signal('');
  private readonly editEl = viewChild<ElementRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>>('editEl');

  protected readonly displayValue = computed(() => {
    const v = this.value();
    const fn = this.displayFor();
    return fn ? fn(v) : v;
  });

  constructor() {
    // Bound value changing externally cancels any in-flight edit so the field
    // doesn't "stick" with stale draft state when the host swaps records.
    effect(() => {
      this.value();
      this.editing.set(false);
    });
  }

  startEdit(): void {
    this.draft.set(this.value());
    this.editing.set(true);
    queueMicrotask(() => {
      const el = this.editEl()?.nativeElement;
      el?.focus();
      if (el && 'select' in el && typeof (el as HTMLInputElement).select === 'function') {
        // select() throws InvalidStateError on some input types (e.g.
        // datetime-local) — focus is enough there, so swallow it.
        try { (el as HTMLInputElement).select(); } catch { /* not selectable */ }
      }
    });
  }

  onInput(e: Event): void {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    this.draft.set(target.value);
  }

  onKey(e: KeyboardEvent): void {
    // Textareas keep newline-on-Enter unless Cmd/Ctrl held — matches GitHub's
    // comment-edit pattern Marvin already uses elsewhere.
    if (e.key === 'Enter' && this.kind() !== 'textarea') {
      e.preventDefault();
      this.commit();
      return;
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      this.commit();
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      this.cancel();
    }
  }

  commit(): void {
    if (!this.editing()) return;
    const next = this.draft();
    this.editing.set(false);
    if (next !== this.value()) this.saved.emit(next);
  }

  private cancel(): void {
    this.editing.set(false);
    this.draft.set(this.value());
  }
}
