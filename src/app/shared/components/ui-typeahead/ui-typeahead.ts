import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  forwardRef,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { type ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { AppIcon } from '@shared/components/app-icon/app-icon';

/**
 * One selectable row. `boosted` floats it visually (a leading ★) — the host is
 * responsible for ordering boosted options first; `hint` is a muted suffix
 * (e.g. "you · 12×").
 */
export interface TypeaheadOption {
  readonly id: string;
  readonly label: string;
  readonly hint?: string;
  readonly boosted?: boolean;
}

let nextTypeaheadId = 0;
const MAX_VISIBLE = 8;

const norm = (s: string): string => s.trim().toLowerCase();

/**
 * A custom combobox: type to filter `options`, arrow/Enter/Esc to navigate, and
 * — when `allowCreate` is set — a "+ Create" row for values not already in the
 * list. Replaces native `<select>`/`<datalist>` for catalog pickers that need
 * fuzzy search, a self-growing free-text path, or ranked/boosted entries.
 *
 * Stateless-by-design: the visible text is the single source of truth (`query`,
 * a two-way model). `pick` fires when an existing option is chosen, `create`
 * when free text is committed; the host re-resolves text→option at commit time,
 * so there's no selection state to desync from what the user sees.
 *
 * Doubles as a {@link ControlValueAccessor} so it can back form-bound entity
 * pickers (`formControlName` / `ngModel`). In form mode the control value is the
 * picked option's `id` (or the raw text when `allowCreate` keeps an off-catalogue
 * value); `query` is just the transient search buffer, and the field reverts to
 * the committed label when the dropdown closes. Quick-add rows that don't bind a
 * form control are unaffected — CVA stays dormant.
 */
@Component({
  selector: 'app-ui-typeahead',
  imports: [AppIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:click)': 'onDocClick($event)' },
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => UiTypeahead), multi: true },
  ],
  template: `
    <div class="ta">
      <input
        type="text"
        class="ta__input"
        role="combobox"
        aria-autocomplete="list"
        [attr.id]="inputId() || null"
        [attr.aria-expanded]="open()"
        [attr.aria-controls]="listId"
        [attr.aria-activedescendant]="activeId()"
        [attr.aria-label]="ariaLabel()"
        [value]="displayValue()"
        [placeholder]="placeholder()"
        [disabled]="disabled()"
        (input)="onInput($any($event.target).value)"
        (focus)="onFocus($event)"
        (blur)="onTouched()"
        (keydown)="onKeydown($event)"
      />

      @if (clearable() && hasValue() && !disabled()) {
        <button
          type="button"
          class="ta__clear"
          aria-label="Clear selection"
          (mousedown)="$event.preventDefault()"
          (click)="clear()"
        >×</button>
      }

      @if (open() && rows().length) {
        <ul class="ta__list" role="listbox" [id]="listId">
          @for (r of rows(); track r.key; let i = $index) {
            <li
              class="ta__opt"
              role="option"
              [id]="optId(i)"
              [class.ta__opt--active]="i === highlight()"
              [class.ta__opt--create]="r.create"
              [attr.aria-selected]="i === highlight()"
              (mousedown)="$event.preventDefault()"
              (mouseenter)="highlight.set(i)"
              (click)="choose(i)"
            >
              @if (r.create) {
                <app-icon name="add" class="ta__icon" />
                <span class="ta__label">Create “{{ query().trim() }}”</span>
              } @else {
                @if (r.option!.boosted) {
                  <span class="ta__star" aria-hidden="true">★</span>
                }
                <span class="ta__label">{{ r.option!.label }}</span>
                @if (r.option!.hint) {
                  <span class="ta__hint">{{ r.option!.hint }}</span>
                }
              }
            </li>
          }
        </ul>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .ta { position: relative; display: block; }

    .ta__input {
      width: 100%;
      box-sizing: border-box;
      font: inherit;
      color: var(--color-text);
      background: var(--color-surface-soft, transparent);
      border: 1px solid color-mix(in srgb, var(--color-border) 60%, transparent);
      border-radius: var(--radius);
      padding: 0.28rem 0.45rem;

      &::placeholder { color: var(--color-text-muted); font-style: italic; }
      &:focus { outline: none; border-color: var(--color-accent); }
      &:disabled { opacity: 0.55; cursor: not-allowed; }
    }

    .ta__clear {
      position: absolute;
      top: 50%;
      right: 0.35rem;
      transform: translateY(-50%);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.1rem;
      height: 1.1rem;
      padding: 0;
      border: none;
      border-radius: 50%;
      background: transparent;
      color: var(--color-text-muted);
      font-size: 0.95rem;
      line-height: 1;
      cursor: pointer;

      &:hover { color: var(--color-text); background: color-mix(in srgb, var(--color-border) 40%, transparent); }
    }

    .ta__list {
      position: absolute;
      z-index: 20;
      top: calc(100% + 0.2rem);
      left: 0;
      right: 0;
      margin: 0;
      padding: 0.2rem;
      list-style: none;
      max-height: 15rem;
      overflow-y: auto;
      background: var(--color-surface, var(--color-bg));
      border: 1px solid color-mix(in srgb, var(--color-border) 80%, transparent);
      border-radius: var(--radius);
      box-shadow: 0 8px 24px -12px rgb(0 0 0 / 0.5);
    }

    .ta__opt {
      display: flex;
      align-items: baseline;
      gap: 0.4rem;
      padding: 0.3rem 0.4rem;
      border-radius: calc(var(--radius) - 2px);
      cursor: pointer;
      font-size: 0.82rem;
      color: var(--color-text);
    }
    .ta__opt--active { background: color-mix(in srgb, var(--color-accent) 18%, transparent); }
    .ta__opt--create { color: var(--color-accent); font-style: italic; }

    .ta__star { flex: 0 0 auto; color: var(--color-accent); font-size: 0.7rem; }
    .ta__icon { flex: 0 0 auto; }
    .ta__label { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .ta__hint { flex: 0 0 auto; font-size: 0.7rem; color: var(--color-text-muted); font-variant-numeric: tabular-nums; }
  `],
})
export class UiTypeahead implements ControlValueAccessor {
  /** Visible text in quick-add mode (two-way); the live search buffer in form mode. */
  readonly query = model<string>('');
  readonly options = input<readonly TypeaheadOption[]>([]);
  /** Offer a "+ Create" row for text not already present (case/space-insensitive). */
  readonly allowCreate = input<boolean>(false);
  /** Show a clear (×) control to reset a form-bound value back to empty (optional fields). */
  readonly clearable = input<boolean>(false);
  readonly placeholder = input<string>('');
  readonly ariaLabel = input<string>('');
  /** Forwarded to the inner <input> so an external `<label for>` associates correctly. */
  readonly inputId = input<string>('');

  /** An existing option was chosen (click or Enter on a row). */
  readonly pick = output<TypeaheadOption>();
  /** Free text committed via the create row or Enter with no list match. */
  readonly create = output<string>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly listId = `ta-list-${nextTypeaheadId++}`;
  protected readonly open = signal(false);
  protected readonly highlight = signal(-1);

  // ── ControlValueAccessor state (dormant unless a form control binds us) ──
  protected readonly disabled = signal(false);
  private readonly formBound = signal(false);
  private readonly committed = signal<string | null>(null);
  // Form mode only: false right after focus (show the committed label, full
  // list, no filtering) → true once the user actually types (filter by query).
  private readonly dirty = signal(false);
  private onChange: (value: string | null) => void = () => {};
  protected onTouched: () => void = () => {};

  private readonly committedLabel = computed<string>(() => {
    const id = this.committed();
    return id === null ? '' : (this.labelOf(id) ?? id);
  });

  // A focused-but-untouched form field shows its current value (selected, so the
  // first keystroke replaces it) and lists everything; once typed it filters.
  // Quick-add always reflects the live query.
  protected readonly displayValue = computed<string>(() => {
    if (!this.formBound()) return this.query();
    if (this.open() && this.dirty()) return this.query();
    return this.committedLabel();
  });

  // The text actually used to filter: empty while a form field is focused but
  // untouched (so the full catalogue shows), the live query otherwise.
  private readonly effectiveQuery = computed<string>(() =>
    this.formBound() && !this.dirty() ? '' : this.query(),
  );

  protected readonly hasValue = computed<boolean>(() => this.committed() !== null);

  private labelOf(id: string): string | undefined {
    return this.options().find((o) => o.id === id)?.label;
  }

  private readonly filtered = computed<readonly TypeaheadOption[]>(() => {
    const q = norm(this.effectiveQuery());
    const opts = this.options();
    if (!q) return opts.slice(0, MAX_VISIBLE);
    return opts.filter((o) => norm(o.label).includes(q)).slice(0, MAX_VISIBLE);
  });

  // A create row appears only when nothing already matches exactly — the guard
  // that stops "hack squat" spawning a duplicate of "Hack Squat".
  private readonly showCreate = computed<boolean>(() => {
    if (!this.allowCreate()) return false;
    const q = norm(this.effectiveQuery());
    if (!q) return false;
    return !this.options().some((o) => norm(o.label) === q);
  });

  protected readonly rows = computed<{ key: string; option: TypeaheadOption | null; create: boolean }[]>(() => {
    const base: { key: string; option: TypeaheadOption | null; create: boolean }[] =
      this.filtered().map((o) => ({ key: o.id, option: o, create: false }));
    if (this.showCreate()) base.push({ key: '__create', option: null, create: true });
    return base;
  });

  protected readonly activeId = computed<string | null>(() => {
    const h = this.highlight();
    return h >= 0 && h < this.rows().length ? this.optId(h) : null;
  });

  protected optId(i: number): string {
    return `${this.listId}-opt-${i}`;
  }

  protected onFocus(e: FocusEvent): void {
    if (this.disabled()) return;
    this.open.set(true);
    if (this.formBound()) {
      // Show the current value selected (first keystroke replaces it) with the
      // full list visible until the user types. setTimeout defers past the
      // mouseup that would otherwise collapse the selection on a click-focus.
      this.dirty.set(false);
      const input = e.target as HTMLInputElement;
      setTimeout(() => input.select(), 0);
    }
  }

  protected onInput(value: string): void {
    this.query.set(value);
    this.dirty.set(true);
    this.open.set(true);
    this.highlight.set(-1);
  }

  protected onKeydown(e: KeyboardEvent): void {
    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        this.open.set(true);
        const n = this.rows().length;
        if (n) this.highlight.update((h) => (h + 1) % n);
        break;
      }
      case 'ArrowUp': {
        e.preventDefault();
        const n = this.rows().length;
        if (n) this.highlight.update((h) => (h <= 0 ? n - 1 : h - 1));
        break;
      }
      case 'Enter': {
        e.preventDefault();
        this.commitFromKeyboard();
        break;
      }
      case 'Escape':
        this.close();
        break;
      default:
        break;
    }
  }

  // Enter resolves in this priority: highlighted row → top filtered match →
  // create. So a frequent food/known exercise is reused on Enter; only a
  // genuinely unmatched string falls through to create.
  private commitFromKeyboard(): void {
    const rows = this.rows();
    const h = this.highlight();
    if (h >= 0 && h < rows.length) {
      this.choose(h);
      return;
    }
    // Nothing typed and nothing highlighted → no-op (don't auto-pick the first
    // row). effectiveQuery, not query, so a focused field holding a prior pick
    // doesn't re-pick on a bare Enter.
    if (!this.effectiveQuery().trim()) return;
    const top = this.filtered()[0];
    if (top) this.emitPick(top);
    else if (this.showCreate()) this.emitCreate();
  }

  protected choose(i: number): void {
    const row = this.rows()[i];
    if (!row) return;
    if (row.create) this.emitCreate();
    else if (row.option) this.emitPick(row.option);
  }

  protected onDocClick(e: MouseEvent): void {
    if (!this.host.nativeElement.contains(e.target as Node)) this.close();
  }

  private emitPick(option: TypeaheadOption): void {
    this.query.set(option.label);
    this.committed.set(option.id);
    this.close();
    this.pick.emit(option);
    this.onChange(option.id);
  }

  private emitCreate(): void {
    const text = this.query().trim();
    if (!text) return;
    this.committed.set(text); // off-catalogue value keeps the raw text as its id
    this.close();
    this.create.emit(text);
    this.onChange(text);
  }

  private close(): void {
    this.open.set(false);
    this.highlight.set(-1);
    this.dirty.set(false);
  }

  protected clear(): void {
    this.committed.set(null);
    this.query.set('');
    this.close();
    this.onChange(''); // empty string matches the nonNullable string controls we back
    this.onTouched();
  }

  // ── ControlValueAccessor ────────────────────────────────────────
  writeValue(value: string | null): void {
    this.committed.set(value ? value : null); // treat '' as "no selection"
  }
  registerOnChange(fn: (value: string | null) => void): void {
    this.onChange = fn;
    this.formBound.set(true);
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }
}
