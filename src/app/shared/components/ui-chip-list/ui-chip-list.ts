import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { EntityChip, type EntityType } from '@shared/components/entity-chip/entity-chip';

export type UiChipListTone = 'default' | 'blocker';

export interface UiChipListItem {
  readonly id: string;
  readonly label: string;
  readonly tone?: UiChipListTone;
  readonly entityType?: EntityType;
  readonly seq?: number;
}

export interface UiChipListPickerOption {
  readonly id: string;
  readonly label: string;
  readonly entityType?: EntityType;
}

@Component({
  selector: 'app-ui-chip-list',
  imports: [EntityChip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ui-chip-list">
      @for (item of items(); track item.id) {
        @if (item.entityType) {
          <span class="ui-chip-list__chip ui-chip-list__chip--entity">
            <button type="button" class="ui-chip-list__entity-btn" (click)="itemClicked.emit(item.id)">
              <app-entity-chip [type]="item.entityType" [id]="item.id" [label]="item.label" [seq]="item.seq ?? null" />
            </button>
            @if (allowRemove()) {
              <button type="button" class="ui-chip-list__remove"
                [attr.aria-label]="'Remove ' + item.label"
                (click)="removed.emit(item.id)">×</button>
            }
          </span>
        } @else {
          <span
            class="ui-chip-list__chip"
            [class.ui-chip-list__chip--blocker]="item.tone === 'blocker'">
            <button
              type="button"
              class="ui-chip-list__label"
              (click)="itemClicked.emit(item.id)">
              {{ item.label }}
            </button>
            @if (allowRemove()) {
              <button
                type="button"
                class="ui-chip-list__remove"
                [attr.aria-label]="'Remove ' + item.label"
                (click)="removed.emit(item.id)">×</button>
            }
          </span>
        }
      } @empty {
        <span class="ui-chip-list__empty">{{ emptyLabel() }}</span>
      }
      @if (pickerOptions().length > 0 || alwaysShowAdd()) {
        <button
          type="button"
          class="ui-chip-list__add"
          [attr.aria-expanded]="pickerOpen()"
          (click)="togglePicker()">
          {{ addLabel() }}
        </button>
      }
    </div>
    @if (pickerOpen()) {
      <div class="ui-chip-list__picker">
        @for (opt of pickerOptions(); track opt.id) {
          <button type="button" class="ui-chip-list__picker-opt" (click)="onAdd(opt.id)">
            @if (opt.entityType) {
              <app-entity-chip [type]="opt.entityType" [id]="opt.id" [label]="opt.label" />
            } @else {
              {{ opt.label }}
            }
          </button>
        } @empty {
          <span class="ui-chip-list__picker-empty">No options available</span>
        }
      </div>
    }
  `,
  styles: [`
    :host {
      display: block;
    }

    .ui-chip-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.3rem;
      align-items: center;
      margin-bottom: 0.4rem;
    }

    .ui-chip-list__chip {
      display: inline-flex;
      align-items: center;
      gap: 0;
      border: 1px solid var(--color-border);
      border-radius: 3px;
      overflow: hidden;
      font-size: 0.7rem;
    }

    .ui-chip-list__chip--blocker {
      border-color: #a33;
    }

    .ui-chip-list__chip--entity {
      border: none;
      border-radius: 0;
      background: none;
    }

    .ui-chip-list__entity-btn {
      background: none;
      border: none;
      padding: 0;
      margin: 0;
      font: inherit;
      cursor: pointer;
    }

    .ui-chip-list__label {
      padding: 1px 6px;
      color: var(--color-text);
      text-decoration: none;
      background: transparent;
      border: none;
      font: inherit;
      font-size: 0.7rem;
      cursor: pointer;
    }

    .ui-chip-list__label:hover {
      text-decoration: underline;
      color: var(--color-accent);
    }

    .ui-chip-list__remove {
      padding: 1px 5px;
      background: transparent;
      border: none;
      border-left: 1px solid var(--color-border);
      cursor: pointer;
      color: var(--color-text-muted);
      font-size: 0.75rem;
      line-height: 1;
    }

    .ui-chip-list__remove:hover {
      background: var(--color-surface);
      color: var(--color-danger);
    }

    .ui-chip-list__empty {
      color: var(--color-text-muted);
      font-size: 0.7rem;
      font-style: italic;
    }

    .ui-chip-list__add {
      margin-left: 0.15rem;
      padding: 2px 8px;
      background: transparent;
      border: 1px solid var(--color-border);
      border-radius: 3px;
      font: inherit;
      font-size: 0.7rem;
      cursor: pointer;
      color: var(--color-text-muted);
    }

    .ui-chip-list__add:hover {
      border-color: var(--color-text);
      color: var(--color-text);
    }

    .ui-chip-list__picker {
      display: flex;
      flex-wrap: wrap;
      gap: 0.3rem;
      margin-top: 0.3rem;
    }

    .ui-chip-list__picker-opt {
      padding: 2px 8px;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 3px;
      font: inherit;
      font-size: 0.7rem;
      cursor: pointer;
      color: var(--color-text);
    }

    .ui-chip-list__picker-opt:hover {
      border-color: var(--color-accent);
      color: var(--color-accent);
    }

    .ui-chip-list__picker-empty {
      color: var(--color-text-muted);
      font-size: 0.7rem;
      font-style: italic;
    }
  `],
})
export class UiChipList {
  readonly items = input.required<readonly UiChipListItem[]>();
  readonly pickerOptions = input<readonly UiChipListPickerOption[]>([]);
  readonly addLabel = input<string>('+ add');
  readonly emptyLabel = input<string>('none');
  readonly allowRemove = input(true);
  readonly alwaysShowAdd = input(false);

  readonly itemClicked = output<string>();
  readonly removed = output<string>();
  readonly added = output<string>();

  readonly pickerOpen = signal(false);

  togglePicker(): void {
    this.pickerOpen.update(v => !v);
  }

  onAdd(id: string): void {
    this.added.emit(id);
    this.pickerOpen.set(false);
  }
}
