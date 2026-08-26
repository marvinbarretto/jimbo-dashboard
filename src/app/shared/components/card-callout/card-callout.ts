import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type CalloutVariant =
  | 'question' | 'rework' | 'draft' | 'rationale' | 'result' | 'error'
  // The brief a piece of work was commissioned against, shown so a result can
  // be judged against it. Deliberately neutral: it is the yardstick, not an
  // outcome, and colouring it success or warning would prejudge the answer.
  | 'brief';

@Component({
  selector: 'app-card-callout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // E2E hook — see docs/conventions.md §"E2E selectors via data-testid".
  // The variant attribute lets specs scope assertions to a specific callout
  // type (e.g. rework reason, open question) without depending on class names.
  host: {
    '[attr.data-testid]':  "'card-callout'",
    '[attr.data-variant]': 'variant()',
  },
  template: `
    <div [class]="cls()">
      <span class="card-callout__label">{{ label() }}</span>
      <span class="card-callout__body">
        <ng-content />
      </span>
    </div>
  `,
  styles: [`
    .card-callout {
      border-left: 2px solid var(--color-border);
      padding: 0.3rem 0.5rem;
      background: var(--color-surface-soft);
      font-size: 0.7rem;
      color: var(--color-text-soft);
      line-height: 1.45;
      border-radius: 0 var(--radius) var(--radius) 0;
    }
    .card-callout__label {
      display: block;
      font-size: 0.6rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-text-muted);
      margin-bottom: 0.15rem;
    }
    .card-callout__body { display: block; }

    .card-callout--question  { border-color: var(--color-warning); background: color-mix(in srgb, var(--color-warning) 10%, transparent); }
    .card-callout--question .card-callout__label { color: var(--color-warning); }

    .card-callout--rework    { border-color: var(--color-warning); background: color-mix(in srgb, var(--color-warning) 8%, transparent); }
    .card-callout--rework .card-callout__label { color: var(--color-warning); }

    .card-callout--draft     { border-color: var(--color-warning); background: color-mix(in srgb, var(--color-warning) 12%, transparent); }
    .card-callout--draft .card-callout__label { color: var(--color-warning); }

    .card-callout--rationale { border-color: var(--color-info); background: color-mix(in srgb, var(--color-info) 8%, transparent); }
    .card-callout--rationale .card-callout__label { color: var(--color-info); }

    .card-callout--brief     { border-color: var(--color-border); background: color-mix(in srgb, var(--color-text) 4%, transparent); }
    .card-callout--brief .card-callout__label { color: var(--color-text-muted); }

    .card-callout--result    { border-color: var(--color-success); background: color-mix(in srgb, var(--color-success) 8%, transparent); }
    .card-callout--result .card-callout__label { color: var(--color-success); }

    .card-callout--error     { border-color: var(--color-danger); background: color-mix(in srgb, var(--color-danger) 10%, transparent); color: var(--color-danger); }
    .card-callout--error .card-callout__label { color: var(--color-danger); }
  `],
})
export class CardCallout {
  readonly variant = input.required<CalloutVariant>();
  readonly label   = input.required<string>();

  protected readonly cls = computed(() => `card-callout card-callout--${this.variant()}`);
}
