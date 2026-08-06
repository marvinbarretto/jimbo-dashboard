import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  ViewChild,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';

let nextId = 0;

/** Keep the panel this far from the viewport edge when floating. */
const VIEWPORT_MARGIN = 8;
/** Below this much room underneath the trigger, open upward instead. */
const MIN_SPACE_BELOW = 140;

type PanelPosition = { top: number; left: number; maxHeight: number };

@Component({
  selector: 'app-ui-dropdown',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onDocumentClick($event)',
  },
  template: `
    <!--
      [trigger] slot: project purely visual content (badge, chip, text).
      Do NOT project interactive elements — this <button> is the interactive element.
    -->
    <button
      #triggerEl
      type="button"
      class="ui-dropdown__trigger"
      [attr.aria-label]="ariaLabel() || null"
      [attr.aria-expanded]="open()"
      [attr.aria-controls]="panelId"
      [attr.aria-haspopup]="ariaHaspopup()"
      [disabled]="disabled()"
      (click)="toggle()"
      (keydown)="onTriggerKeydown($event)">
      <ng-content select="[trigger]" />
      <span class="ui-dropdown__chevron" [class.ui-dropdown__chevron--open]="open()"></span>
    </button>

    @if (open()) {
      <!-- Positioned immediately below trigger. No viewport-flip — keep lists short. -->
      <div
        #panelEl
        [id]="panelId"
        class="ui-dropdown__panel"
        [class.ui-dropdown__panel--floating]="floating()"
        [attr.popover]="floating() ? 'manual' : null"
        [style.top.px]="floating() ? panelPos()?.top : null"
        [style.left.px]="floating() ? panelPos()?.left : null"
        [style.max-height.px]="floating() ? panelPos()?.maxHeight : null"
        (keydown)="onPanelKeydown($event)">
        <ng-content select="[panel]" />
      </div>
    }
  `,
  styles: [`
    :host {
      position: relative;
      display: inline-block;
    }

    .ui-dropdown__trigger {
      background: none;
      border: none;
      padding: 0;
      margin: 0;
      font: inherit;
      color: inherit;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      border-radius: 3px;
      transition: opacity 0.1s;

      &:hover { opacity: 0.8; }
    }

    .ui-dropdown__chevron {
      width: 0;
      height: 0;
      border-left: 4px solid transparent;
      border-right: 4px solid transparent;
      border-top: 5px solid currentColor;
      flex-shrink: 0;
      opacity: 0.85;
      transition: transform 0.12s ease;
    }

    .ui-dropdown__chevron--open {
      transform: rotate(180deg);
    }

    .ui-dropdown__trigger:disabled {
      cursor: default;
      opacity: 0.5;
    }

    .ui-dropdown__trigger:focus-visible {
      outline: 2px solid var(--color-accent);
      outline-offset: 3px;
      border-radius: 3px;
    }

    .ui-dropdown__panel {
      position: absolute;
      top: 100%;
      left: 0;
      z-index: 20;
      margin-top: 0.2rem;
      min-width: max-content;
      background: var(--color-bg);
      border: 1px solid var(--color-border);
      border-radius: 4px;
      box-shadow: 0 4px 12px color-mix(in oklab, var(--color-text) 10%, transparent);
      overflow: hidden;
    }

    // Absolute positioning is clipped by any scrolling ancestor — a dropdown in
    // a table cell (the table scrolls on x) loses most of its panel. Fixed
    // positioning alone isn't enough either: an ancestor with transform,
    // filter or contain becomes the containing block and clips it anyway, and
    // this page already sets overflow-x: clip further up. So the panel is
    // promoted to the top layer via popover, which no ancestor can crop for any
    // reason. Coordinates still come from the trigger's rect, set inline.
    .ui-dropdown__panel--floating {
      position: fixed;
      margin-top: 0;
      // The panel can now be taller than the room beneath it, so it has to be
      // able to scroll rather than run off the bottom of the screen.
      overflow-y: auto;

      // Undo the UA popover defaults (margin:auto, inset:0, its own border and
      // background) so the panel keeps the styling it has when not floating.
      &:popover-open {
        inset: auto;
        margin: 0;
        padding: 0;
        border: 1px solid var(--color-border);
        background: var(--color-bg);
        color: inherit;
        overflow-y: auto;
      }
    }
  `],
})
export class UiDropdown {
  /** Screen-reader label for the trigger button when [trigger] content is not text. */
  readonly ariaLabel = input<string | undefined>(undefined);
  readonly ariaHaspopup = input<'true' | 'menu' | 'listbox' | 'dialog'>('true');
  readonly disabled = input(false);

  /**
   * Position the panel against the viewport instead of the trigger's nearest
   * positioned ancestor. Set this when the dropdown sits inside anything that
   * scrolls or clips — a table cell, an `overflow: auto` pane — where the
   * default absolute panel would be cropped. Costs a rect measurement per open
   * plus scroll/resize listeners while open, so it stays opt-in.
   */
  readonly floating = input(false);

  readonly open = signal(false);
  readonly panelId = `ui-dropdown-panel-${++nextId}`;
  protected readonly panelPos = signal<PanelPosition | null>(null);

  @ViewChild('triggerEl') private readonly triggerEl!: ElementRef<HTMLButtonElement>;
  @ViewChild('panelEl') private readonly panelEl?: ElementRef<HTMLDivElement>;

  private readonly el = inject(ElementRef);
  private readonly doc = inject(DOCUMENT);

  constructor() {
    // Reposition while open. Capture phase matters: an inner scroller (the
    // table) doesn't bubble its scroll to document, so a bubbling listener
    // would leave the panel behind when the cell moves under it.
    const view = this.doc.defaultView;
    const reposition = () => this.measure();
    effect(onCleanup => {
      if (!this.open() || !this.floating() || !view) return;
      this.doc.addEventListener('scroll', reposition, true);
      view.addEventListener('resize', reposition);
      onCleanup(() => {
        this.doc.removeEventListener('scroll', reposition, true);
        view.removeEventListener('resize', reposition);
      });
    });
    inject(DestroyRef).onDestroy(() => {
      this.doc.removeEventListener('scroll', reposition, true);
      view?.removeEventListener('resize', reposition);
    });
  }

  /**
   * Anchors the panel under the trigger, flipping above it when there isn't
   * room below — without a flip, every row in the lower half of a long table
   * opens its panel off-screen.
   */
  private measure(): void {
    const view = this.doc.defaultView;
    if (!this.floating() || !view) return;
    const r = this.triggerEl?.nativeElement.getBoundingClientRect();
    if (!r) return;

    const below = view.innerHeight - r.bottom - VIEWPORT_MARGIN;
    const above = r.top - VIEWPORT_MARGIN;
    const flip = below < MIN_SPACE_BELOW && above > below;
    const maxHeight = Math.max(MIN_SPACE_BELOW, flip ? above : below);

    // Panel width is content-driven, so clamp only once it's been measured;
    // before that, left-align to the trigger.
    const width = this.panelEl?.nativeElement.offsetWidth ?? 0;
    const left = Math.max(
      VIEWPORT_MARGIN,
      Math.min(r.left, view.innerWidth - width - VIEWPORT_MARGIN),
    );

    this.panelPos.set({
      top: flip ? Math.max(VIEWPORT_MARGIN, r.top - maxHeight) : r.bottom + 2,
      left,
      maxHeight,
    });
  }

  toggle(): void {
    this.open.update(v => !v);
    if (this.open()) this.afterOpen();
    else this.panelPos.set(null);
  }

  /**
   * Runs once the panel has been rendered by `@if`. Order matters: a popover is
   * `display: none` until shown, so measuring before showPopover() reads a
   * width of 0 and the right-edge clamp does nothing.
   */
  private afterOpen(): void {
    // Pre-position from the trigger rect so the panel never paints at 0,0.
    this.measure();
    setTimeout(() => {
      this.showAsPopover();
      this.measure();
      this.focusFirstItem();
    });
  }

  /**
   * Promotes the panel to the top layer. Silent no-op when the panel isn't
   * floating or the browser lacks the API — the attribute is then ignored and
   * the panel still renders as a fixed-position element, so an unsupported
   * browser degrades to "possibly clipped" rather than "invisible".
   */
  private showAsPopover(): void {
    const el = this.panelEl?.nativeElement;
    if (!this.floating() || !el?.isConnected) return;
    if (typeof el.showPopover !== 'function') return;
    // showPopover throws if it is already open; matches() is the cheap check.
    if (el.matches(':popover-open')) return;
    try {
      el.showPopover();
    } catch {
      // Losing the top layer only costs us clipping protection, never the menu.
    }
  }

  /** Call from the parent after a selection to close the panel and return focus. */
  close(): void {
    if (!this.open()) return;
    this.open.set(false);
    this.panelPos.set(null);
    this.triggerEl.nativeElement.focus();
  }

  // A popover paints in the top layer but stays a DOM descendant, so this
  // contains() check still correctly treats clicks inside the panel as inside.
  onDocumentClick(event: MouseEvent): void {
    if (!this.el.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
      this.panelPos.set(null);
    }
  }

  onTriggerKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      // Arrow-open goes through the same path as click-open. It used to set
      // `open` directly, which skipped positioning entirely — a floating panel
      // opened by keyboard would have painted unpositioned.
      case 'ArrowDown':
        event.preventDefault();
        if (!this.open()) { this.open.set(true); this.afterOpen(); }
        else setTimeout(() => this.focusFirstItem());
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (!this.open()) this.open.set(true);
        this.measure();
        setTimeout(() => {
          this.showAsPopover();
          this.measure();
          this.focusLastItem();
        });
        break;
      case 'Escape':
        this.close();
        break;
    }
  }

  onPanelKeydown(event: KeyboardEvent): void {
    const items = this.focusableItems();
    const idx = items.indexOf(document.activeElement as HTMLElement);

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        items[(idx + 1) % items.length]?.focus();
        break;
      case 'ArrowUp':
        event.preventDefault();
        items[(idx - 1 + items.length) % items.length]?.focus();
        break;
      case 'Home':
        event.preventDefault();
        items[0]?.focus();
        break;
      case 'End':
        event.preventDefault();
        items[items.length - 1]?.focus();
        break;
      case 'Escape':
        this.close();
        break;
      case 'Tab':
        // Let Tab move focus naturally; close the panel without stealing focus back.
        this.open.set(false);
        break;
    }
  }

  private focusableItems(): HTMLElement[] {
    return Array.from(
      this.panelEl?.nativeElement.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), ' +
        '[role="option"]:not([aria-disabled="true"]), [tabindex]:not([tabindex="-1"])'
      ) ?? []
    );
  }

  private focusFirstItem(): void { this.focusableItems()[0]?.focus(); }
  private focusLastItem(): void  { this.focusableItems().at(-1)?.focus(); }
}
