import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-ui-subhead',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ui-subhead">
      <span class="ui-subhead__label">{{ label() }}</span>
      @if (count() !== null && count() !== undefined) {
        <span class="ui-subhead__count">{{ count() }}</span>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .ui-subhead {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0.85rem 0 0.35rem;
    }

    .ui-subhead__label {
      font-size: 0.68rem;
      font-weight: 600;
      color: var(--color-text);
    }

    .ui-subhead__count {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 1.2rem;
      min-height: 1.2rem;
      padding: 0 0.3rem;
      border-radius: 999px;
      background: color-mix(in oklab, var(--color-text) 8%, transparent);
      color: var(--color-text-muted);
      font-size: 0.6rem;
      font-weight: 700;
    }
  `],
})
export class UiSubhead {
  readonly label = input.required<string>();
  readonly count = input<number | null | undefined>(undefined);
}
