import { DestroyRef, Directive, ElementRef, inject, input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MentionService } from './mention.service';
import type { MentionTrigger } from './mention-trigger';

type FieldEl = HTMLTextAreaElement | HTMLInputElement;

/**
 * Wires a textarea/input to the mention dropdown.
 *
 * Detects when the user types one of the configured trigger characters at
 * start-of-word, tracks the query that follows, and forwards keyboard nav
 * to the shared MentionService overlay.
 *
 * Selection (Enter/Tab) replaces the `<char><query>` text using the
 * `onSelect` return value (or removes it when null).
 */
@Directive({
  selector: 'textarea[appMention], input[appMention]',
  host: {
    '(input)': 'onInput()',
    '(keydown)': 'onKeydown($event)',
    '(blur)': 'onBlur()',
    '(click)': 'onCaretMove()',
    '(keyup)': 'onCaretMove()',
  },
})
export class MentionDirective {
  private readonly hostRef = inject(ElementRef<FieldEl>);
  private readonly mentionService = inject(MentionService);
  private readonly destroyRef = inject(DestroyRef);

  /** Triggers active on this field. Order doesn't matter; keyed by `char`. */
  readonly appMention = input.required<MentionTrigger[]>();

  /** Position of the trigger char in the textarea while a mention is active. */
  private active: { trigger: MentionTrigger; start: number } | null = null;

  constructor() {
    // Listen for commits from the dropdown UI (click). Only the directive
    // currently holding `active` will apply the insertion.
    this.mentionService.commit$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ insert }) => {
        if (this.active) this.applyInsertion(insert);
      });
  }

  protected onInput(): void {
    const el = this.hostRef.nativeElement;
    const cursor = el.selectionStart ?? el.value.length;
    const text = el.value;

    if (this.active) {
      const trigger = this.active.trigger;
      const start = this.active.start;
      // Trigger char must still exist at its anchor position
      if (text[start] !== trigger.char) {
        this.deactivate();
        // Fall through: maybe a brand-new trigger at current cursor
      } else if (cursor < start + 1) {
        this.deactivate();
      } else {
        const query = text.slice(start + 1, cursor);
        // Whitespace or newline ends the mention
        if (/[\s]/.test(query)) {
          this.deactivate();
        } else {
          this.mentionService.updateQuery(query);
          return;
        }
      }
    }

    // Look for a new trigger char immediately before the cursor
    if (cursor === 0) return;
    const charBefore = text[cursor - 1];
    const trigger = this.appMention().find(t => t.char === charBefore);
    if (!trigger) return;
    // Must be at start or after whitespace (avoid emails, hashtags-mid-word)
    const beforeTrigger = cursor >= 2 ? text[cursor - 2] : '';
    if (beforeTrigger !== '' && !/\s/.test(beforeTrigger)) return;

    this.active = { trigger, start: cursor - 1 };
    this.mentionService.open(trigger, '', el);
  }

  protected onKeydown(ev: Event): void {
    const e = ev as KeyboardEvent;
    if (!this.active) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.mentionService.moveSelection(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.mentionService.moveSelection(-1);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (this.mentionService.results().length > 0) {
        e.preventDefault();
        e.stopPropagation();
        this.mentionService.commit();
      } else {
        // Nothing to commit — quietly close so Enter can submit the form.
        this.deactivate();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      this.deactivate();
    }
  }

  protected onCaretMove(): void {
    if (!this.active) return;
    const el = this.hostRef.nativeElement;
    const cursor = el.selectionStart ?? 0;
    if (cursor < this.active.start + 1) {
      this.deactivate();
    }
  }

  protected onBlur(): void {
    // Defer so a click on a dropdown row can land before we close.
    setTimeout(() => this.deactivate(), 150);
  }

  private deactivate(): void {
    if (!this.active) return;
    this.active = null;
    this.mentionService.close();
  }

  /**
   * Replace `<char><query>` with the insertion text (or remove it entirely if
   * null), preserving the rest of the field, then dispatch `input` so the
   * binding signal upstream syncs.
   */
  private applyInsertion(insert: string | null): void {
    const a = this.active;
    if (!a) return;
    const el = this.hostRef.nativeElement;
    const text = el.value;
    const cursor = el.selectionStart ?? text.length;
    const before = text.slice(0, a.start);
    const after = text.slice(cursor);
    const insertion = insert ?? '';
    const next = before + insertion + after;
    el.value = next;
    const newPos = before.length + insertion.length;
    el.selectionStart = el.selectionEnd = newPos;
    this.active = null;
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }
}
