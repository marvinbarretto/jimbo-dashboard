import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

type UiPageWidth = 'narrow' | 'standard' | 'wide' | 'full';

/**
 * Standard page container. The app shell owns the horizontal gutter
 * (`--app-gutter`) and left-alignment; this owns vertical rhythm + a
 * max-width cap. Use `maxWidth` to tune the cap for one page without
 * adding a new named variant (e.g. a page that grows a sidebar widget).
 *
 * `full` drops the max-width cap entirely (fills whatever the shell's
 * gutter gives it) — for pages that want every pixel of horizontal space
 * without going full-bleed. That's different from `page-bleed`, which also
 * escapes the gutter itself; `full` still respects it.
 *
 * Full-bleed pages (boards, ui-lab) skip this entirely and use the
 * `page-bleed` host class instead — see docs/modules/app-shell.md.
 *
 * `centered` is for the rare page that's a focused flow rather than a basic
 * left-aligned page (e.g. the pomo start wizard) — most pages should leave
 * it off.
 */
@Component({
  selector: 'app-ui-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<ng-content />`,
  styles: [`
    @use 'breakpoints' as bp;

    :host {
      display: block;
      min-width: 0;
      padding-block: 2rem 3rem;
      max-width: var(--ui-page-max-width);
    }

    :host(.ui-page--centered) {
      margin-inline: auto;
    }

    @include bp.mobile {
      :host {
        padding-block: 1rem 1.5rem;
      }
    }
  `],
  host: {
    '[style.--ui-page-max-width]': 'maxWidthRem()',
    '[class.ui-page--centered]': 'centered()',
  },
})
export class UiPage {
  readonly width = input<UiPageWidth>('standard');
  readonly maxWidth = input<number | undefined>(undefined);
  readonly centered = input(false);

  private readonly widthScale: Record<Exclude<UiPageWidth, 'full'>, number> = {
    narrow: 40,
    standard: 72,
    wide: 100,
  };

  readonly maxWidthRem = computed(() => {
    if (this.maxWidth() !== undefined) return `${this.maxWidth()}rem`;
    const width = this.width();
    return width === 'full' ? 'none' : `${this.widthScale[width]}rem`;
  });
}
