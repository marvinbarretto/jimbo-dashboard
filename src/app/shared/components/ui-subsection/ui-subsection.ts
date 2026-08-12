import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-ui-subsection',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="ui-subsection">
      <div class="ui-subsection__label">
        {{ label() }}
        @if (hint(); as h) {
          <span class="ui-subsection__hint">{{ h }}</span>
        }
      </div>
      <div class="ui-subsection__body">
        <ng-content />
      </div>
    </section>
  `,
  styles: [`
    :host {
      display: block;
      min-width: 0;
    }

    .ui-subsection {
      padding: 1rem;
      border: 1px solid var(--color-border);
      border-radius: 8px;
      background: color-mix(in oklab, var(--color-bg) 85%, var(--color-surface));
    }

    .ui-subsection__label {
      // Shared label register (src/styles/_typography.scss) — tokens, not the
      // .label-caps class, so component styles need no global load-order.
      font-family: var(--label-family);
      font-size: var(--label-size);
      letter-spacing: var(--label-tracking);
      text-transform: uppercase;
      color: var(--color-text-muted);
      margin-bottom: 0.6rem;
    }

    .ui-subsection__hint {
      text-transform: none;
      letter-spacing: 0;
      opacity: 0.7;
      margin-left: 0.3rem;
    }

    .ui-subsection__body {
      min-width: 0;
    }
  `],
})
export class UiSubsection {
  readonly label = input.required<string>();
  readonly hint = input<string | null>(null);
}
