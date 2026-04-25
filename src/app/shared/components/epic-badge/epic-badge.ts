import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

// Marks a card as an epic — a vault item that contains other items. Sits in the
// same header right-slot as the blocker badge, in accent color. Symbol + count
// keeps it scannable: "↓ 3" reads as "has 3 things underneath".
//
// Pair of conventions:
//   blocker badge → blue circle ?  → "needs human input"
//   epic badge    → accent pill ↓N → "this is structural, has subtasks"
@Component({
  selector: 'app-epic-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="epic-badge" [attr.title]="hoverText()">↓ {{ count() }}</span>`,
  styles: [`
    .epic-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.15rem;
      padding: 0.05rem 0.35rem;
      border-radius: 999px;
      background: color-mix(in oklch, var(--color-accent) 25%, transparent);
      color: var(--color-accent);
      font-family: var(--font-mono);
      font-size: 0.65rem;
      font-weight: 600;
      line-height: 1;
      cursor: help;
      white-space: nowrap;
    }
  `],
})
export class EpicBadge {
  readonly count = input.required<number>();

  readonly hoverText = computed(() => {
    const n = this.count();
    return `Epic — ${n} subtask${n === 1 ? '' : 's'}`;
  });
}
