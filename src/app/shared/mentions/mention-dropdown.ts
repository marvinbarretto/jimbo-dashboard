import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MentionService } from './mention.service';

interface RenderRow {
  kind: 'header' | 'item';
  group?: string;
  itemIndex?: number;
  id: string;
  label?: string;
  prefix?: string;
  color?: string | null;
}

@Component({
  selector: 'app-mention-dropdown',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (mentionService.active(); as a) {
      <div class="mention-dropdown" role="listbox" [attr.aria-label]="'Mention ' + a.trigger.char">
        @if (mentionService.loading() && mentionService.results().length === 0) {
          <div class="mention-dropdown__meta">searching…</div>
        } @else if (mentionService.results().length === 0) {
          <div class="mention-dropdown__meta">
            no matches @if (a.query) { for <strong>{{ a.trigger.char }}{{ a.query }}</strong> }
          </div>
        } @else {
          @for (row of rows(); track row.id) {
            @if (row.kind === 'header') {
              <div class="mention-dropdown__group">{{ row.group }}</div>
            } @else {
              <div
                class="mention-dropdown__row"
                [class.mention-dropdown__row--active]="row.itemIndex === mentionService.selectedIndex()"
                role="option"
                [attr.aria-selected]="row.itemIndex === mentionService.selectedIndex()"
                (mousedown)="onRowMousedown($event, row.itemIndex!)"
                (mouseenter)="mentionService.setSelectedIndex(row.itemIndex!)">
                @if (row.color) {
                  <span class="mention-dropdown__dot" [style.background]="row.color"></span>
                } @else {
                  <span class="mention-dropdown__dot mention-dropdown__dot--empty"></span>
                }
                @if (row.prefix) {
                  <span class="mention-dropdown__prefix">{{ row.prefix }}</span>
                }
                <span class="mention-dropdown__label">{{ row.label }}</span>
              </div>
            }
          }
        }
      </div>
    }
  `,
  styles: [`
    .mention-dropdown {
      min-width: 18rem;
      max-width: 32rem;
      width: max-content;
      max-height: 18rem;
      overflow-y: auto;
      background: var(--color-bg);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
      padding: 0.25rem 0;
      font-size: 0.85rem;
    }

    .mention-dropdown__group {
      padding: 0.25rem 0.6rem 0.15rem;
      font-size: 0.62rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--color-text-muted);
    }

    .mention-dropdown__row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.3rem 0.65rem;
      cursor: pointer;
      color: var(--color-text);

      &--active {
        background: color-mix(in srgb, var(--color-accent) 14%, transparent);
      }
    }

    .mention-dropdown__dot {
      width: 0.55rem;
      height: 0.55rem;
      border-radius: 50%;
      flex-shrink: 0;
      box-shadow: 0 0 0 1px color-mix(in srgb, currentColor 25%, transparent);

      &--empty {
        background: var(--color-border);
        box-shadow: none;
      }
    }

    .mention-dropdown__prefix {
      font-size: 0.72rem;
      color: var(--color-text-muted);
      font-variant-numeric: tabular-nums;
      flex-shrink: 0;
      letter-spacing: 0.02em;
    }

    .mention-dropdown__label {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
      min-width: 0;
    }

    .mention-dropdown__meta {
      padding: 0.5rem 0.7rem;
      font-size: 0.78rem;
      color: var(--color-text-muted);
      font-style: italic;
    }
  `],
})
export class MentionDropdown {
  protected readonly mentionService = inject(MentionService);

  protected onRowMousedown(e: MouseEvent, index: number): void {
    // Prevent the textarea from losing focus before commit fires.
    e.preventDefault();
    this.mentionService.setSelectedIndex(index);
    this.mentionService.commit();
  }

  /** Flatten results into header + item rows, preserving the flat selectedIndex. */
  protected readonly rows = computed<RenderRow[]>(() => {
    const items = this.mentionService.results();
    const out: RenderRow[] = [];
    let lastGroup: string | undefined = undefined;
    items.forEach((item, idx) => {
      if (item.group !== lastGroup) {
        if (item.group) {
          out.push({ kind: 'header', group: item.group, id: `__h:${item.group}` });
        }
        lastGroup = item.group;
      }
      out.push({
        kind: 'item',
        itemIndex: idx,
        id: item.id,
        label: item.label,
        prefix: item.prefix,
        color: item.color,
      });
    });
    return out;
  });
}
