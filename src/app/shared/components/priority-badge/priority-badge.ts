import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { Priority } from '@domain/vault/vault-item';

// Pn pill, colour-coded by urgency. Pure display — no click handler.
// P0 → danger red, P1 → warning amber, P2 → muted, P3 → faint border.
@Component({
  selector: 'app-priority-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span [class]="cls()">{{ label() }}</span>`,
  styles: [`
    .priority-badge {
      display: inline-block;
      font-family: var(--font-mono);
      font-size: 0.65rem;
      font-weight: 600;
      padding: 0.05rem 0.35rem;
      border-radius: 3px;
      line-height: 1.2;
    }
    .priority-badge--P0 { background: color-mix(in srgb, var(--color-danger)     20%, transparent); color: var(--color-danger);     }
    .priority-badge--P1 { background: color-mix(in srgb, var(--color-warning)    20%, transparent); color: var(--color-warning);    }
    .priority-badge--P2 { background: color-mix(in srgb, var(--color-text-muted) 20%, transparent); color: var(--color-text-muted); }
    .priority-badge--P3 { background: var(--color-border); color: var(--color-text-muted); }
  `],
})
export class PriorityBadge {
  readonly priority = input.required<Priority>();
  readonly cls   = computed(() => `priority-badge priority-badge--P${this.priority()}`);
  readonly label = computed(() => `P${this.priority()}`);
}
