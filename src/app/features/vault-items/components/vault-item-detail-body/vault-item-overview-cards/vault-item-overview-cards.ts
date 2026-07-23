import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export interface VaultItemSummary {
  readonly label: string;
  readonly value: string;
  /** Identity the operator can't reconstruct from `value` — a parent's title, a
   *  source URL. Rendered verbatim, so null it out rather than restating `value`. */
  readonly detail: string | null;
}

@Component({
  selector: 'app-vault-item-overview-cards',
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dl class="vault-item-meta-strip" aria-label="Item overview">
      @for (pair of pairs(); track pair.label) {
        <div class="vault-item-meta-strip__pair">
          <dt>{{ pair.label }}</dt>
          <dd>
            <span class="vault-item-meta-strip__value">{{ pair.value }}</span>
            @if (pair.detail) {
              <span class="vault-item-meta-strip__detail" [title]="pair.detail">{{ pair.detail }}</span>
            }
          </dd>
        </div>
      }
    </dl>
  `,
  styles: [`
    :host { display: block; }

    // A label/value grid, not a wrapped one-liner. The strip sits in the narrow
    // right-hand column, so a parent title never fit inline — the flex version
    // broke "Sub-item of #3364" across lines and stranded separators at line
    // starts. Rows always align; only the detail truncates.
    .vault-item-meta-strip {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      gap: 0.15rem 0.5rem;
      margin: 0.4rem 0 0;
      padding: 0;
      font-size: 0.68rem;
      color: var(--color-text-muted);
      line-height: 1.4;
    }

    .vault-item-meta-strip__pair {
      display: contents;

      dt {
        font-weight: 600;
        color: var(--color-text-soft, var(--color-text-muted));
        text-transform: uppercase;
        font-size: 0.6rem;
        letter-spacing: 0.06em;
        line-height: 1.6;   // optically aligns the small caps with the value
      }

      dd {
        margin: 0;
        min-width: 0;
        color: var(--color-text);
      }
    }

    .vault-item-meta-strip__value {
      white-space: nowrap;
    }

    // Truncates rather than wraps — a parent title is identity, not prose, and
    // one clipped line reads better than three. Full text is on the title attr.
    .vault-item-meta-strip__detail {
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: var(--color-text-muted);
    }
  `],
})
export class VaultItemOverviewCards {
  readonly source = input.required<VaultItemSummary>();
  readonly hierarchy = input.required<VaultItemSummary>();
  // timeline omitted — already shown by vault-item-meta-line
  readonly queue = input.required<VaultItemSummary>();

  protected readonly pairs = computed(() => [this.source(), this.hierarchy(), this.queue()]);
}
