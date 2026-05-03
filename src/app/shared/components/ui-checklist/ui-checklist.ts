import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type UiChecklistTone = 'warn' | 'err';

export interface UiChecklistStatus {
  readonly label: string;
  readonly tone: UiChecklistTone;
  readonly title?: string;
}

export interface UiChecklistItem {
  readonly text: string;
  readonly done: boolean;
  readonly status?: UiChecklistStatus | null;
}

@Component({
  selector: 'app-ui-checklist',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (items().length > 0) {
      <ul class="ui-checklist">
        @for (item of items(); track item.text) {
          <li
            class="ui-checklist__item"
            [class.ui-checklist__item--done]="item.done"
            [class.ui-checklist__item--warn]="item.status?.tone === 'warn'"
            [class.ui-checklist__item--err]="item.status?.tone === 'err'">
            <span class="ui-checklist__mark" [attr.aria-label]="item.done ? 'done' : 'pending'">
              {{ item.done ? '✓' : '○' }}
            </span>
            <span class="ui-checklist__text">{{ item.text }}</span>
            @if (item.status; as s) {
              <span
                class="ui-checklist__chip"
                [class.ui-checklist__chip--warn]="s.tone === 'warn'"
                [class.ui-checklist__chip--err]="s.tone === 'err'"
                [title]="s.title ?? null">
                {{ s.label }}
              </span>
            }
          </li>
        }
      </ul>
    } @else if (emptyMessage(); as empty) {
      <div class="ui-checklist__empty">{{ empty }}</div>
    }
  `,
  styles: [`
    :host {
      display: block;
    }

    .ui-checklist {
      display: flex;
      flex-direction: column;
      gap: 3px;
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .ui-checklist__item {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 0.25rem 0.5rem;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      font-size: 0.75rem;
    }

    .ui-checklist__item--done {
      color: var(--color-text-muted);
      text-decoration: line-through;
    }

    .ui-checklist__item--warn {
      border-left: 2px solid var(--color-warning, #d99);
      padding-left: 0.45rem;
    }

    .ui-checklist__item--err {
      border-left: 2px solid var(--color-error, #f88);
      padding-left: 0.45rem;
    }

    .ui-checklist__mark {
      flex-shrink: 0;
      width: 1rem;
    }

    .ui-checklist__text {
      flex: 1;
    }

    .ui-checklist__chip {
      font-size: 0.65rem;
      padding: 0 0.35rem;
      border-radius: 3px;
      white-space: nowrap;
    }

    .ui-checklist__chip--warn {
      background: color-mix(in oklab, var(--color-warning, #d99) 20%, transparent);
      color: var(--color-warning, #d99);
    }

    .ui-checklist__chip--err {
      background: color-mix(in oklab, var(--color-error, #f88) 20%, transparent);
      color: var(--color-error, #f88);
    }

    .ui-checklist__empty {
      padding: 0.4rem 0.6rem;
      background: #fbe7e7;
      border: 1px dashed #a33;
      color: #a33;
      font-size: 0.7rem;
    }
  `],
})
export class UiChecklist {
  readonly items = input.required<readonly UiChecklistItem[]>();
  readonly emptyMessage = input<string | null>(null);
}
