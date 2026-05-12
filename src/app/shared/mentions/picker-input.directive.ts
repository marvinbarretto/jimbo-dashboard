import { DestroyRef, Directive, ElementRef, inject, input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MentionService } from './mention.service';
import type { MentionTrigger } from './mention-trigger';

type FieldEl = HTMLInputElement | HTMLTextAreaElement;

/**
 * Focus-driven sibling of `[appMention]`. Where the mention directive watches
 * for a trigger character typed mid-text, this directive opens the mention
 * dropdown immediately on focus and treats the field's value as the live
 * query. Use this for "+ Add project…" / "+ Add parent epic…" affordances
 * where the user expects a typeahead rather than a magic char.
 *
 * Reuses MentionService + MentionDropdown verbatim — only the activation
 * pattern differs. Keyboard nav (Arrow/Enter/Escape) mirrors MentionDirective.
 */
@Directive({
  selector: 'input[appPickerInput], textarea[appPickerInput]',
  host: {
    '(focus)':    'onFocus()',
    '(input)':    'onInput()',
    '(blur)':     'onBlur()',
    '(keydown)':  'onKeydown($event)',
    '(mousedown)': 'onMouseDown()',
  },
})
export class PickerInputDirective {
  private readonly hostRef = inject(ElementRef<FieldEl>);
  private readonly mentionService = inject(MentionService);
  private readonly destroyRef = inject(DestroyRef);

  /** The trigger drives search() and onSelect(). `char` is unused here. */
  readonly appPickerInput = input.required<MentionTrigger>();

  private active = false;

  constructor() {
    // When MentionService fires commit$ while we're active, clear the field —
    // the parent has already received the pick via trigger.onSelect.
    this.mentionService.commit$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (!this.active) return;
        this.hostRef.nativeElement.value = '';
        this.hostRef.nativeElement.blur();
        this.active = false;
      });
  }

  protected onMouseDown(): void {
    // Mousedown alone doesn't trigger focus on already-focused inputs, but if
    // the field is already focused and the user re-clicks, re-open so they
    // get the dropdown back without retyping.
    if (this.active) return;
    // focus() will run our onFocus handler.
  }

  protected onFocus(): void {
    if (this.active) return;
    this.active = true;
    const el = this.hostRef.nativeElement;
    this.mentionService.open(this.appPickerInput(), el.value, el);
  }

  protected onInput(): void {
    if (!this.active) return;
    this.mentionService.updateQuery(this.hostRef.nativeElement.value);
  }

  protected onBlur(): void {
    if (!this.active) return;
    // Defer so a mousedown on a dropdown row can commit before we close.
    setTimeout(() => {
      if (!this.active) return;
      this.active = false;
      this.mentionService.close();
    }, 150);
  }

  protected onKeydown(ev: Event): void {
    if (!this.active) return;
    const e = ev as KeyboardEvent;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.mentionService.moveSelection(1);
        return;
      case 'ArrowUp':
        e.preventDefault();
        this.mentionService.moveSelection(-1);
        return;
      case 'Enter':
      case 'Tab':
        if (this.mentionService.results().length > 0) {
          e.preventDefault();
          e.stopPropagation();
          this.mentionService.commit();
        }
        return;
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        this.hostRef.nativeElement.blur();
        return;
    }
  }
}
