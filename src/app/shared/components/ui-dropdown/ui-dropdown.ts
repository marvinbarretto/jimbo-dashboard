import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  inject,
  input,
  signal,
} from '@angular/core';

let nextId = 0;

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
      gap: 0.25rem;
    }

    .ui-dropdown__chevron {
      width: 0;
      height: 0;
      border-left: 3px solid transparent;
      border-right: 3px solid transparent;
      border-top: 4px solid currentColor;
      flex-shrink: 0;
      opacity: 0.65;
      transition: transform 0.12s ease;
    }

    .ui-dropdown__chevron--open {
      transform: rotate(180deg);
    }

    .ui-dropdown__trigger:disabled {
      cursor: default;
      opacity: 0.6;
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
  `],
})
export class UiDropdown {
  /** Screen-reader label for the trigger button when [trigger] content is not text. */
  readonly ariaLabel = input<string | undefined>(undefined);
  readonly ariaHaspopup = input<'true' | 'menu' | 'listbox' | 'dialog'>('true');
  readonly disabled = input(false);

  readonly open = signal(false);
  readonly panelId = `ui-dropdown-panel-${++nextId}`;

  @ViewChild('triggerEl') private readonly triggerEl!: ElementRef<HTMLButtonElement>;
  @ViewChild('panelEl') private readonly panelEl?: ElementRef<HTMLDivElement>;

  private readonly el = inject(ElementRef);

  toggle(): void {
    this.open.update(v => !v);
    if (this.open()) {
      // Defer so @if renders the panel before we try to focus into it.
      setTimeout(() => this.focusFirstItem());
    }
  }

  /** Call from the parent after a selection to close the panel and return focus. */
  close(): void {
    if (!this.open()) return;
    this.open.set(false);
    this.triggerEl.nativeElement.focus();
  }

  onDocumentClick(event: MouseEvent): void {
    if (!this.el.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }

  onTriggerKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.open.set(true);
        setTimeout(() => this.focusFirstItem());
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.open.set(true);
        setTimeout(() => this.focusLastItem());
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
