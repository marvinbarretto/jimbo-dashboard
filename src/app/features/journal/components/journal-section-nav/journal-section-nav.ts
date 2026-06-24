import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  input,
  NgZone,
  signal,
  viewChild,
} from '@angular/core';

export interface JournalNavSection {
  /** DOM id of the section's anchor element (set on the matching host). */
  readonly id: string;
  readonly label: string;
}

/**
 * Sticky chip strip that scroll-spies the day's sections and jumps to them.
 *
 * The single source of truth for the sticky offset is the strip's OWN bottom
 * edge: because the app header + Day/Week/Month tab bar + this strip are all
 * sticky and stacked, `strip.getBoundingClientRect().bottom` is exactly the
 * y where scrollable content begins — whether the page is at the top or
 * scrolled. Both the active-chip detection and click-to-jump use that one
 * number, so there is no hardcoded offset math to drift apart.
 */
@Component({
  selector: 'app-journal-section-nav',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav #strip class="jsecnav" aria-label="Day sections">
      @for (s of sections(); track s.id) {
        <button
          type="button"
          class="jsecnav__chip"
          [class.active]="activeId() === s.id"
          (click)="jumpTo(s.id)">
          {{ s.label }}
        </button>
      }
    </nav>
  `,
  styles: [`
    :host {
      display: block;
      position: sticky;
      // Sits directly below the Day/Week/Month tab bar, which itself sits
      // below the app header. --journal-tabs-height is owned by the day page.
      top: calc(var(--app-header-height, 0px) + var(--journal-tabs-height, 0px));
      z-index: 10;
      // Break out of the page gutter so the strip + divider span full width,
      // matching <app-ui-tab-bar>; inner padding re-aligns chips with content.
      margin-inline: calc(-1 * var(--app-gutter, 0px));
    }

    .jsecnav {
      display: flex;
      gap: 0.25rem;
      overflow-x: auto;
      padding: 0.4rem var(--app-gutter, 1.5rem);
      // Solid base so content scrolling underneath does not bleed through.
      background: var(--color-bg);
      border-bottom: 1px solid var(--color-border);
      scrollbar-width: none;
    }

    .jsecnav::-webkit-scrollbar {
      display: none;
    }

    .jsecnav__chip {
      flex: none;
      padding: 0.3rem 0.7rem;
      border: 1px solid transparent;
      border-radius: 999px;
      background: transparent;
      color: var(--color-text-muted);
      font-size: 0.75rem;
      font-weight: 500;
      cursor: pointer;
      white-space: nowrap;
    }

    .jsecnav__chip:hover {
      color: var(--color-text);
      background: color-mix(in srgb, var(--color-accent) 6%, transparent);
    }

    .jsecnav__chip:focus-visible {
      outline: none;
      box-shadow: var(--focus-ring);
    }

    .jsecnav__chip.active {
      color: var(--section-accent, var(--color-accent));
      border-color: color-mix(in srgb, var(--section-accent, var(--color-accent)) 40%, transparent);
      background: color-mix(in srgb, var(--section-accent, var(--color-accent)) 10%, transparent);
    }
  `],
})
export class JournalSectionNav {
  readonly sections = input.required<readonly JournalNavSection[]>();

  private readonly strip = viewChild.required<ElementRef<HTMLElement>>('strip');
  protected readonly activeId = signal<string>('');

  constructor() {
    const zone = inject(NgZone);
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      let ticking = false;
      const onScroll = (): void => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          this.recomputeActive(zone);
          ticking = false;
        });
      };

      zone.runOutsideAngular(() => {
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll, { passive: true });
      });

      this.recomputeActive(zone);

      destroyRef.onDestroy(() => {
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onScroll);
      });
    });
  }

  // The active section is the last anchor whose top has scrolled above the
  // strip's bottom edge (the line where content becomes visible).
  private recomputeActive(zone: NgZone): void {
    const line = this.strip().nativeElement.getBoundingClientRect().bottom;
    let active = this.sections()[0]?.id ?? '';
    for (const s of this.sections()) {
      const el = document.getElementById(s.id);
      if (el && el.getBoundingClientRect().top <= line + 4) active = s.id;
    }
    if (active !== this.activeId()) {
      zone.run(() => this.activeId.set(active));
    }
  }

  protected jumpTo(id: string): void {
    const el = document.getElementById(id);
    if (!el) return;
    this.activeId.set(id); // snappy feedback before the scroll settles
    const line = this.strip().nativeElement.getBoundingClientRect().bottom;
    const top = window.scrollY + el.getBoundingClientRect().top - line - 4;
    window.scrollTo({ top, behavior: 'smooth' });
  }
}
