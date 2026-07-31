import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, input, output, signal, viewChild } from '@angular/core';
import { UiSubsection } from '@shared/components/ui-subsection/ui-subsection';
import { RelativeTimePipe } from '@shared/pipes/relative-time.pipe';
import { MarkdownPipe } from '@shared/pipes/markdown.pipe';

// Operator-created (source.kind='manual') items get an editable scratchpad
// because the "body" doubles as live working notes. Ingested items keep the
// "(immutable input)" semantics so the audit signal of the original capture
// isn't lost.
@Component({
  selector: 'app-vault-item-intake-block',
  imports: [UiSubsection, RelativeTimePipe, MarkdownPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-ui-subsection
      [label]="label()"
      [hint]="resolvedHint()"
    >
      @if (editable() && editing()) {
        <textarea
          #bodyInput
          class="vault-item-intake-block__edit"
          [value]="draft()"
          (input)="onInput($event)"
          (keydown)="onKey($event)"
          (blur)="commit()"
          rows="6"
          placeholder="What's the situation? Notes for yourself…"
        ></textarea>
      } @else if (body()) {
        <div
          class="vault-item-intake-block__body markdown-body prose-read"
          [class.vault-item-intake-block__body--editable]="editable()"
          [attr.role]="editable() ? 'button' : null"
          [attr.tabindex]="editable() ? 0 : null"
          [attr.aria-label]="editable() ? 'Edit body' : null"
          [innerHTML]="body() | markdown"
          (click)="editable() && startEdit()"
          (keydown.enter)="editable() && startEdit()"
        ></div>
      } @else if (editable()) {
        <button
          type="button"
          class="vault-item-intake-block__placeholder"
          (click)="startEdit()"
        >+ Add notes</button>
      } @else {
        <p class="vault-item-intake-block__muted">no body content</p>
      }
      @if (showNote()) {
        <p class="vault-item-intake-block__note">{{ createdAt() | relativeTime }} · operator intake</p>
      }
    </app-ui-subsection>
  `,
  styles: [`
    :host {
      display: block;
      min-width: 0;
    }

    .vault-item-intake-block__body {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-left: 2px solid var(--color-border);
      padding: 0.5rem 0.75rem;
      margin: 0;
      // The work column is wider than a comfortable line, so cap at the shared
      // reading measure (_typography.scss) plus this box's own horizontal
      // padding — box-sizing is border-box, so without the padding back it is
      // the TEXT that would undershoot the measure, not just the box.
      max-width: calc(var(--prose-measure) + 1.5rem);
    }

    .vault-item-intake-block__body--editable {
      cursor: text;

      &:hover  { background: color-mix(in srgb, var(--color-accent) 8%, var(--color-surface)); }
      &:focus-visible {
        outline: 2px solid var(--color-accent);
        outline-offset: 1px;
      }
    }

    .vault-item-intake-block__edit {
      width: 100%;
      max-width: calc(var(--prose-measure) + 1.5rem);
      box-sizing: border-box;
      padding: 0.4rem 0.6rem;
      margin: 0;
      // Same register as the rendered body it replaces, so entering edit mode
      // reflows nothing — a form control does not inherit font, so it has to
      // opt into the reading tokens explicitly.
      font-family: var(--prose-family);
      font-size: var(--prose-size);
      line-height: var(--prose-line);
      letter-spacing: var(--prose-tracking);
      border: 1px solid var(--color-accent);
      border-radius: var(--radius);
      background: var(--color-bg-elevated, var(--color-bg));
      color: var(--color-text);
      resize: vertical;

      &:focus { outline: none; }
    }

    .vault-item-intake-block__placeholder {
      width: 100%;
      max-width: calc(var(--prose-measure) + 1.5rem);
      padding: 0.6rem 0.75rem;
      border: 1px dashed var(--color-border);
      border-radius: var(--radius);
      background: transparent;
      color: var(--color-text-muted);
      // Empty-state chrome, not prose — the scanning register.
      font-family: var(--scan-family);
      font-size: var(--scan-size);
      text-align: left;
      cursor: pointer;

      &:hover {
        border-color: var(--color-accent);
        color: var(--color-text);
      }
    }

    .vault-item-intake-block__note {
      font-size: 0.65rem;
      color: var(--color-text-muted);
      margin: 0.25rem 0 0;
    }

    .vault-item-intake-block__muted {
      color: var(--color-text-muted);
      font-size: 0.75rem;
      margin: 0;
    }
  `],
})
export class VaultItemIntakeBlock {
  readonly body = input.required<string>();
  readonly createdAt = input.required<string>();
  readonly editable = input<boolean>(false);
  readonly bodyChange = output<string>();

  // Presentation overrides. Defaults preserve the original "Intake / (immutable
  // input)" framing for existing callers (body-task, body-capture); the bands
  // layout passes label="The work", hint=null to drop the archived-input feel.
  readonly label = input('Intake');
  readonly hint = input<string | null | undefined>(undefined);
  readonly showNote = input(true);

  protected readonly resolvedHint = computed(() => {
    const override = this.hint();
    if (override !== undefined) return override; // string OR explicit null (no hint)
    return this.editable() ? '(working notes — click to edit)' : '(immutable input)';
  });

  protected readonly editing = signal(false);
  protected readonly draft = signal('');
  private readonly inputRef = viewChild<ElementRef<HTMLTextAreaElement>>('bodyInput');

  constructor() {
    // When the bound item changes (dialog swap), drop edit state.
    effect(() => {
      this.body();
      this.editing.set(false);
    });
  }

  protected startEdit(): void {
    if (!this.editable()) return;
    this.draft.set(this.body());
    this.editing.set(true);
    queueMicrotask(() => {
      const el = this.inputRef()?.nativeElement;
      el?.focus();
      // Cursor at end so existing notes remain visible.
      el?.setSelectionRange(el.value.length, el.value.length);
    });
  }

  protected onInput(e: Event): void {
    this.draft.set((e.target as HTMLTextAreaElement).value);
  }

  protected onKey(e: KeyboardEvent): void {
    // Cmd/Ctrl+Enter saves (Enter alone inserts a newline in a textarea).
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      this.commit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      this.cancel();
    }
  }

  protected commit(): void {
    if (!this.editing()) return;
    const next = this.draft();
    this.editing.set(false);
    if (next !== this.body()) this.bodyChange.emit(next);
  }

  private cancel(): void {
    this.editing.set(false);
    this.draft.set(this.body());
  }
}
