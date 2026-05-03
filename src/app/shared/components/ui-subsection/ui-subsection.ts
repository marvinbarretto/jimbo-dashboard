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
      padding: 0.7rem;
      border: 1px solid var(--color-border);
      border-radius: 8px;
      background: color-mix(in oklab, var(--color-bg) 85%, var(--color-surface));
    }

    .ui-subsection__label {
      font-size: 0.65rem;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--color-text-muted);
      margin-bottom: 0.35rem;
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
