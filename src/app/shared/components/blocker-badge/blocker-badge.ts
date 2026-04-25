import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

// Red circle with "?" inside. Signals "needs human input" — open questions
// blocking dispatch (P17). Danger-tinted (not info) so a blocked card reads
// as urgent on a 2k-row scan, not just informational. Hover title shows count.
@Component({
  selector: 'app-blocker-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="blocker-badge" [attr.title]="hoverText()">?</span>`,
  styles: [`
    .blocker-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1rem;
      height: 1rem;
      border-radius: 50%;
      background: var(--color-danger);
      color: var(--color-bg);
      font-size: 0.7rem;
      font-weight: 700;
      line-height: 1;
      cursor: help;
    }
  `],
})
export class BlockerBadge {
  readonly count = input.required<number>();

  readonly hoverText = computed(() => {
    const n = this.count();
    return `${n} open question${n === 1 ? '' : 's'} — blocks dispatch`;
  });
}
