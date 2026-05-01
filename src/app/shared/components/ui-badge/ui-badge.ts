import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

type UiBadgeTone =
  | 'neutral'
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info';

@Component({
  selector: 'app-ui-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span [class]="classes()" [attr.title]="title()">
      <ng-content />
    </span>
  `,
  styles: [`
    .ui-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      min-height: 1.45rem;
      padding: 0.1rem 0.45rem;
      border: 1px solid color-mix(in srgb, var(--badge-color, var(--color-border-strong)) 45%, var(--color-border));
      border-radius: var(--radius);
      background: color-mix(in srgb, var(--badge-color, transparent) 8%, transparent);
      color: var(--badge-color, var(--color-text-soft));
      font-size: 0.64rem;
      font-weight: 700;
      line-height: 1.2;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      white-space: nowrap;
    }

    .ui-badge--subtle {
      font-size: 0.64rem;
      font-weight: 500;
      letter-spacing: 0.03em;
    }

    .ui-badge--neutral { --badge-color: var(--color-text-soft); }
    .ui-badge--accent  { --badge-color: var(--color-accent); }
    .ui-badge--success { --badge-color: var(--color-success); }
    .ui-badge--warning { --badge-color: var(--color-warning); }
    .ui-badge--danger  { --badge-color: var(--color-danger); }
    .ui-badge--info    { --badge-color: var(--color-info); }
  `],
})
export class UiBadge {
  readonly tone = input<UiBadgeTone>('neutral');
  readonly subtle = input(false);
  readonly title = input<string | null>(null);

  readonly classes = computed(() => {
    const classes = ['ui-badge', `ui-badge--${this.tone()}`];
    if (this.subtle()) {
      classes.push('ui-badge--subtle');
    }
    return classes.join(' ');
  });
}
