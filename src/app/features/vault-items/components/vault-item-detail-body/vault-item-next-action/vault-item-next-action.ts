import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { NextAction } from '@domain/vault/next-action';

@Component({
  selector: 'app-vault-item-next-action',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-tone]':    'action().tone',
    '[attr.data-testid]':  "'vault-item-next-action'",
  },
  template: `
    @let a = action();
    <span class="vault-item-next-action__dot" aria-hidden="true"></span>
    <span class="vault-item-next-action__prefix">{{ a.prefix }}</span>
    @if (a.value) {
      <span class="vault-item-next-action__value">{{ a.value }}</span>
    }
  `,
  styles: [`
    :host {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.25rem 0.55rem;
      border-radius: var(--radius);
      font-size: 0.8rem;
      line-height: 1.4;
      background: var(--color-surface-soft);
      border-left: 2px solid var(--color-border);
    }

    .vault-item-next-action__dot {
      width: 0.5rem;
      height: 0.5rem;
      border-radius: 50%;
      background: var(--color-text-muted);
      flex: 0 0 auto;
    }

    .vault-item-next-action__prefix {
      text-transform: uppercase;
      font-size: 0.65rem;
      letter-spacing: 0.06em;
      color: var(--color-text-muted);
    }

    .vault-item-next-action__value {
      color: var(--color-text);
      font-weight: 500;
    }

    :host([data-tone="waiting"]) {
      border-color: var(--color-warning);
      background: color-mix(in srgb, var(--color-warning) 8%, transparent);
    }
    :host([data-tone="waiting"]) .vault-item-next-action__dot   { background: var(--color-warning); }
    :host([data-tone="waiting"]) .vault-item-next-action__prefix { color: var(--color-warning); }

    :host([data-tone="ready"]) {
      border-color: var(--color-success);
      background: color-mix(in srgb, var(--color-success) 8%, transparent);
    }
    :host([data-tone="ready"]) .vault-item-next-action__dot    { background: var(--color-success); }
    :host([data-tone="ready"]) .vault-item-next-action__prefix { color: var(--color-success); }

    :host([data-tone="done"]) {
      border-color: var(--color-success);
    }
    :host([data-tone="done"]) .vault-item-next-action__dot    { background: var(--color-success); }
    :host([data-tone="done"]) .vault-item-next-action__prefix { color: var(--color-success); }

    :host([data-tone="archived"]) {
      opacity: 0.6;
    }
  `],
})
export class VaultItemNextActionComponent {
  readonly action = input.required<NextAction>();
}
