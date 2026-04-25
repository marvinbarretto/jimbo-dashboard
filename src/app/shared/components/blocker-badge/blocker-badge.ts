import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

// Blue circle with "?" inside. Signals "needs human input" — open questions
// blocking dispatch (P17). Renders with a hover title showing the count.
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
      background: var(--color-info);
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
