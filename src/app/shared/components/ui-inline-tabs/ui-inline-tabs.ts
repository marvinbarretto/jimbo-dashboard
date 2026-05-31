import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export interface UiInlineTabOption {
  readonly value: string;
  readonly label: string;
  readonly count?: number;
  // Optional accent dot (e.g. project colour) rendered before the label.
  readonly dotColor?: string | null;
}

/**
 * Lightweight in-page tabs. Underline-active style with no page-chrome —
 * distinct from `app-ui-tab-bar` which is a sticky top-level page nav with
 * section-accent backing. Use this inside content sections to switch between
 * facets of the same data (e.g. "Epics by project" → per-project lists).
 *
 * Stateless: the host owns the `value`, the component just renders + emits.
 */
@Component({
  selector: 'app-ui-inline-tabs',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ui-inline-tabs" role="tablist" [attr.aria-label]="ariaLabel()">
      @for (opt of options(); track opt.value) {
        <button
          type="button"
          class="ui-inline-tabs__tab"
          [class.ui-inline-tabs__tab--active]="value() === opt.value"
          role="tab"
          [attr.aria-selected]="value() === opt.value"
          (click)="changed.emit(opt.value)"
        >
          @if (opt.dotColor) {
            <span class="ui-inline-tabs__dot" [style.background]="opt.dotColor" aria-hidden="true"></span>
          }
          <span class="ui-inline-tabs__label">{{ opt.label }}</span>
          @if (opt.count != null) {
            <span class="ui-inline-tabs__count">{{ opt.count }}</span>
          }
        </button>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }

    .ui-inline-tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem 0.5rem;
      border-bottom: 1px solid var(--color-border, #e5e7eb);
    }

    .ui-inline-tabs__tab {
      font: inherit;
      font-size: 0.78rem;
      padding: 0.5rem 0.75rem;
      background: transparent;
      color: var(--color-text-muted, #6b7280);
      border: 0;
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      line-height: 1.3;
      transition: color 0.15s, border-color 0.15s;

      &:hover:not(&--active) {
        color: var(--color-text, inherit);
      }

      &--active {
        color: var(--color-text, inherit);
        border-bottom-color: var(--color-accent, #6366f1);
      }

      &:focus-visible {
        outline: 2px solid var(--color-accent, #6366f1);
        outline-offset: 2px;
        border-radius: 2px;
      }
    }

    .ui-inline-tabs__dot {
      width: 0.55rem;
      height: 0.55rem;
      border-radius: 999px;
      background: var(--color-border, #e5e7eb);
      flex-shrink: 0;
    }

    .ui-inline-tabs__count {
      font-family: var(--font-mono);
      font-size: 0.7rem;
      color: var(--color-text-muted, #6b7280);
      padding: 0.05rem 0.4rem;
      border-radius: 999px;
      background: color-mix(in oklab, var(--color-text, #111) 8%, transparent);
      font-variant-numeric: tabular-nums;
    }

    .ui-inline-tabs__tab--active .ui-inline-tabs__count {
      background: color-mix(in oklab, var(--color-accent, #6366f1) 18%, transparent);
      color: var(--color-accent, #6366f1);
    }
  `],
})
export class UiInlineTabs {
  readonly options = input.required<readonly UiInlineTabOption[]>();
  readonly value = input.required<string>();
  readonly ariaLabel = input<string>('Tabs');

  readonly changed = output<string>();
}
