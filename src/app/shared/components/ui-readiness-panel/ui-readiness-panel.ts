import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type UiReadinessVerdict = 'ready' | 'not_ready' | 'blocked';

export interface UiReadinessCheck {
  readonly key: string;
  readonly label: string;
  readonly ok: boolean;
  readonly blocker: string | null;
}

export interface UiReadinessData {
  readonly checks: readonly UiReadinessCheck[];
  readonly passed: number;
  readonly total: number;
  readonly verdict: UiReadinessVerdict;
}

@Component({
  selector: 'app-ui-readiness-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <details class="ui-readiness-panel" [open]="defaultOpen()">
      <summary class="ui-readiness-panel__summary">
        <span>{{ data().passed }}/{{ data().total }} checks passed</span>
        <span [class]="'ui-readiness-panel__verdict ui-readiness-panel__verdict--' + data().verdict">
          {{ data().verdict }}
        </span>
      </summary>
      <ul class="ui-readiness-panel__list">
        @for (check of data().checks; track check.key) {
          <li
            class="ui-readiness-panel__check"
            [class.ui-readiness-panel__check--ok]="check.ok"
            [class.ui-readiness-panel__check--miss]="!check.ok">
            <span class="ui-readiness-panel__mark">{{ check.ok ? '✓' : '✗' }}</span>
            <span class="ui-readiness-panel__label">
              {{ check.label }}
              @if (!check.ok && check.blocker) {
                <span class="ui-readiness-panel__blocker"> — {{ check.blocker }}</span>
              }
            </span>
          </li>
        }
      </ul>
    </details>
  `,
  styles: [`
    :host {
      display: block;
    }

    .ui-readiness-panel {
      display: block;
      margin-bottom: 0.8rem;
      padding: 0.45rem 0.5rem;
      border: 1px solid var(--color-border);
      border-radius: 6px;
      background: color-mix(in oklab, var(--color-surface) 72%, var(--color-bg));
    }

    .ui-readiness-panel[open] {
      padding-bottom: 0.55rem;
    }

    .ui-readiness-panel__summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      cursor: pointer;
      list-style: none;
      font-size: 0.72rem;
      font-weight: 600;
      color: var(--color-text);
    }

    .ui-readiness-panel__summary::-webkit-details-marker {
      display: none;
    }

    .ui-readiness-panel__verdict {
      font-size: 0.6rem;
      padding: 1px 5px;
      border: 1px solid var(--color-border);
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    .ui-readiness-panel__verdict--ready {
      border-color: #3b7a3b;
      color: #3b7a3b;
    }

    .ui-readiness-panel__verdict--not_ready {
      border-color: #8a6d00;
      color: #8a6d00;
    }

    .ui-readiness-panel__verdict--blocked {
      border-color: #a33;
      color: #a33;
    }

    .ui-readiness-panel__list {
      display: flex;
      flex-direction: column;
      gap: 3px;
      font-size: 0.7rem;
      list-style: none;
      padding: 0;
      margin: 0.5rem 0 0;
    }

    .ui-readiness-panel__check {
      display: flex;
      gap: 0.375rem;
      align-items: baseline;
    }

    .ui-readiness-panel__mark {
      width: 12px;
      flex-shrink: 0;
    }

    .ui-readiness-panel__check--ok .ui-readiness-panel__mark {
      color: #3b7a3b;
    }

    .ui-readiness-panel__check--ok .ui-readiness-panel__label {
      color: var(--color-text-muted);
    }

    .ui-readiness-panel__check--miss .ui-readiness-panel__mark {
      color: #a33;
    }

    .ui-readiness-panel__check--miss .ui-readiness-panel__label {
      color: var(--color-text);
    }

    .ui-readiness-panel__blocker {
      color: var(--color-text-muted);
      font-size: 0.65rem;
    }
  `],
})
export class UiReadinessPanel {
  readonly data = input.required<UiReadinessData>();
  readonly defaultOpen = input(true);
}
