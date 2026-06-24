import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { UiCard } from '../ui-card/ui-card';

@Component({
  selector: 'app-ui-stat-card',
  imports: [UiCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-ui-card tone="soft" [compact]="true">
      <div class="ui-stat-card__body">
        <span class="ui-stat-card__label">{{ label() }}</span>
        <strong class="ui-stat-card__value">{{ value() }}</strong>
        @if (detail(); as d) {
          <p class="ui-stat-card__detail">{{ d }}</p>
        }
      </div>
    </app-ui-card>
  `,
  styles: [`
    /* Flex chain so the card fills its grid row's height (equal heights across a
       row) and the body centres its contents on both axes. */
    :host {
      display: flex;
      min-width: 0;
    }

    app-ui-card {
      display: flex;
      flex: 1;
      min-width: 0;
    }

    .ui-stat-card__body {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      gap: 0.24rem;
      padding: 0.75rem 0.8rem;
      min-width: 0;
      height: 100%;
      box-sizing: border-box;
    }

    .ui-stat-card__label {
      font-size: 0.62rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--color-text-soft);
    }

    .ui-stat-card__value {
      font-size: 0.8rem;
      line-height: 1.35;
      color: var(--color-text);
      font-weight: 650;
      word-break: break-word;
    }

    .ui-stat-card__detail {
      margin: 0;
      font-size: 0.7rem;
      line-height: 1.4;
      color: var(--color-text-muted);
      word-break: break-word;
    }
  `],
})
export class UiStatCard {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly detail = input<string | null>(null);
}
