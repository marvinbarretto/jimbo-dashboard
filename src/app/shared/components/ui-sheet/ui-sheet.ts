import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * Bottom sheet: scrim + slide-up panel anchored to the viewport bottom,
 * clamped to a phone-ish width on larger screens. The mobile-first surface
 * for focused edit/create tasks where in-place editing would morph the
 * layout (native pickers, keyboards, wrapping inputs).
 *
 * Presentational and stateless: the host owns open/close via @if. Scrim tap,
 * the ✕ button, and Escape all emit `(closed)`; the host removes the sheet.
 * Content is projected — the sheet supplies chrome (handle, heading, close)
 * and safe-area padding only.
 */
@Component({
  selector: 'app-ui-sheet',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(document:keydown.escape)': 'closed.emit()' },
  template: `
    <div class="ui-sheet__scrim" (click)="closed.emit()"></div>
    <div class="ui-sheet" role="dialog" aria-modal="true" [attr.aria-label]="heading()">
      <div class="ui-sheet__handle"></div>
      <header class="ui-sheet__head">
        <h4 class="ui-sheet__heading">{{ heading() }}</h4>
        <button
          type="button"
          class="ui-sheet__close"
          aria-label="Close"
          (click)="closed.emit()"
        >✕</button>
      </header>
      <ng-content />
    </div>
  `,
  styles: [`
    /* Above the sticky app header (z 100) — a sheet owns the screen. */
    .ui-sheet__scrim {
      position: fixed;
      inset: 0;
      z-index: 120;
      background: rgb(0 0 0 / 0.55);
      animation: ui-sheet-scrim-in 160ms ease;
    }

    .ui-sheet {
      position: fixed;
      inset: auto 0 0 0;
      z-index: 121;
      max-width: 26rem;
      margin: 0 auto;
      padding: 0.4rem 1.1rem calc(1.1rem + env(safe-area-inset-bottom));
      max-height: 85dvh;
      overflow-y: auto;
      background: var(--color-surface, var(--color-bg));
      border: 1px solid var(--color-border);
      border-bottom: none;
      border-radius: 1.1rem 1.1rem 0 0;
      animation: ui-sheet-in 220ms cubic-bezier(0.2, 0.9, 0.3, 1);
    }

    @media (prefers-reduced-motion: reduce) {
      .ui-sheet__scrim,
      .ui-sheet { animation: none; }
    }

    @keyframes ui-sheet-in {
      from { transform: translateY(40%); opacity: 0.4; }
      to   { transform: translateY(0);   opacity: 1; }
    }

    @keyframes ui-sheet-scrim-in {
      from { opacity: 0; }
      to   { opacity: 1; }
    }

    .ui-sheet__handle {
      width: 2.4rem;
      height: 0.28rem;
      margin: 0.35rem auto 0.6rem;
      border-radius: 999px;
      background: color-mix(in srgb, var(--color-border) 80%, transparent);
    }

    .ui-sheet__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.9rem;
    }

    .ui-sheet__heading {
      margin: 0;
      font-size: 0.95rem;
    }

    .ui-sheet__close {
      width: 2.4rem;
      height: 2.4rem;
      margin-right: -0.5rem;
      border: none;
      background: transparent;
      color: var(--color-text-muted);
      font-size: 1rem;
      cursor: pointer;
      border-radius: var(--radius);

      &:focus-visible {
        outline: none;
        box-shadow: var(--focus-ring);
      }
    }
  `],
})
export class UiSheet {
  readonly heading = input.required<string>();
  readonly closed = output<void>();
}
