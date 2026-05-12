import { Directive, effect, inject, input } from '@angular/core';
import { AbstractControl, NgControl } from '@angular/forms';
import { slugify } from '@shared/utils/slugify';

/**
 * Auto-fills this reactive form control with a slugified version of another
 * control's value, until the user manually edits this control.
 *
 * Usage:
 *   <input formControlName="id"
 *          [appSlugFrom]="form.controls.display_name"
 *          [slugTaken]="existingIds()" />
 *
 * The sync stops the moment the host control becomes `dirty` — i.e. the user
 * has typed into the ID field themselves. After that, edits to the source
 * control no longer touch the host. There is no resume mechanism by design;
 * once the user has expressed intent, we honour it.
 *
 * If `slugTaken` is supplied and the derived slug collides, suffixes `-2`,
 * `-3`, … are appended until a free slug is found. Backend uniqueness is
 * still authoritative — this just avoids handing the user a known-bad value.
 */
@Directive({
  selector: '[appSlugFrom]',
})
export class SlugFromDirective {
  readonly source = input.required<AbstractControl<string | null>>({ alias: 'appSlugFrom' });
  readonly transform = input<(value: string) => string>(slugify);
  readonly taken = input<readonly string[]>([], { alias: 'slugTaken' });

  private readonly ngControl = inject(NgControl);

  constructor() {
    effect((onCleanup) => {
      const src = this.source();
      const fn = this.transform();
      const sub = src.valueChanges.subscribe((value: unknown) => {
        const target = this.ngControl.control;
        // Honour user intent: stop syncing once they've edited the field.
        if (!target || target.dirty) return;
        const base = fn(String(value ?? ''));
        target.setValue(this.disambiguate(base), { emitEvent: false });
      });
      onCleanup(() => sub.unsubscribe());
    });
  }

  private disambiguate(base: string): string {
    if (!base) return '';
    const taken = new Set(this.taken());
    if (!taken.has(base)) return base;
    let n = 2;
    while (taken.has(`${base}-${n}`)) n++;
    return `${base}-${n}`;
  }
}
