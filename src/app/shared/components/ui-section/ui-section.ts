import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

let nextSectionId = 0;

type UiSectionTone = 'default' | 'subtle' | 'alert';

@Component({
  selector: 'app-ui-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section [class]="classes()">
      @if (collapsible()) {
        <h2 class="ui-section__heading">
          <button
            type="button"
            class="ui-section__trigger"
            [attr.aria-controls]="contentId"
            [attr.aria-expanded]="expanded()"
            (click)="toggled.emit()">
            <span class="ui-section__title">{{ title() }}</span>
            @if (meta(); as detail) {
              <span class="ui-section__meta">{{ detail }}</span>
            }
          </button>
        </h2>
      } @else {
        <header class="ui-section__header">
          <h2 class="ui-section__title">{{ title() }}</h2>
          @if (meta(); as detail) {
            <p class="ui-section__meta">{{ detail }}</p>
          }
        </header>
      }

      @if (!collapsible() || expanded()) {
        <div class="ui-section__content" [attr.id]="contentId">
          <ng-content />
        </div>
      }
    </section>
  `,
  styles: [`
    :host {
      display: block;
    }

    .ui-section {
      border: 1px solid var(--color-border);
      background: var(--color-surface-soft);
    }

    .ui-section__heading {
      margin: 0;
    }

    .ui-section__header,
    .ui-section__trigger {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.85rem 1rem;
    }

    .ui-section__header {
      align-items: baseline;
    }

    .ui-section__trigger {
      background: transparent;
      border: 0;
      color: var(--color-text);
      cursor: pointer;
      text-align: left;
    }

    .ui-section__trigger:hover {
      background: color-mix(in srgb, var(--color-accent) 6%, transparent);
    }

    .ui-section__trigger:focus-visible {
      outline: none;
      box-shadow: inset var(--focus-ring);
    }

    .ui-section__title {
      flex: 1;
      margin: 0;
      font-size: 0.72rem;
      font-weight: 700;
      color: var(--color-text);
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    .ui-section__meta {
      margin: 0;
      font-size: 0.65rem;
      font-weight: 400;
      color: var(--color-text-muted);
      letter-spacing: 0;
      text-transform: none;
    }

    .ui-section__content {
      padding: 0.8rem 1rem 1rem;
      border-top: 1px solid var(--color-border);
    }

    .ui-section--subtle .ui-section__content {
      padding-top: 0.75rem;
      background: color-mix(in srgb, var(--color-surface-soft) 80%, var(--color-bg));
    }

    .ui-section--alert .ui-section__content {
      background: color-mix(in srgb, var(--color-danger) 5%, var(--color-surface-soft));
      border-left: 2px solid var(--color-danger);
    }
  `],
})
export class UiSection {
  readonly title = input.required<string>();
  readonly meta = input<string | null>(null);
  readonly expanded = input(true);
  readonly collapsible = input(true);
  readonly tone = input<UiSectionTone>('default');

  readonly toggled = output<void>();

  readonly contentId = `ui-section-content-${nextSectionId++}`;

  readonly classes = computed(() => `ui-section ui-section--${this.tone()}`);
}
