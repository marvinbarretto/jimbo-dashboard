import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { AppIcon } from '@shared/components/app-icon/app-icon';
import { UiButton } from '@shared/components/ui-button/ui-button';
import { UiInlineEdit } from '@shared/components/ui-inline-edit/ui-inline-edit';
import type { FoodLogEntry } from '../../data-access/nutrition.service';

/** A single field-level change emitted when a row edit commits. */
export type NutritionRowPatch = {
  readonly id: string;
  readonly changes: Partial<FoodLogEntry>;
};

type MacroField = 'est_kcal' | 'est_protein_g' | 'est_carbs_g' | 'est_fat_g';

/**
 * One food-log entry as a row. Read mode mirrors the existing `.nutrition__row`
 * (time · text · kcal); edit mode swaps each field for an inline editor and
 * exposes a remove affordance.
 *
 * The row is presentational: it owns no canonical state. Edits emit `(patch)`
 * with the changed fields; the host applies them (optimistically, via service,
 * or against a local signal in the ui-lab) and feeds the new `entry` back in.
 */
@Component({
  selector: 'app-nutrition-row',
  imports: [AppIcon, UiButton, UiInlineEdit],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="nutrition-row" [class.nutrition-row--editable]="editable()">
      <span class="nutrition-row__time">{{ time() }}</span>

      <span class="nutrition-row__text">
        @if (editable()) {
          <app-ui-inline-edit
            [value]="entry().raw_text"
            ariaLabel="Edit food/drink"
            placeholder="food or drink…"
            (saved)="saveText($event)"
          />
        } @else {
          {{ entry().raw_text }}
        }
      </span>

      <span class="nutrition-row__macros" aria-label="macros">
        @if (pending() && !editable()) {
          <span class="nutrition-row__pending" title="Jimbo will estimate macros shortly">
            estimating…
          </span>
        } @else {
          @for (m of macros(); track m.field) {
            <span class="nutrition-row__macro" [class.nutrition-row__macro--kcal]="m.field === 'est_kcal'">
              @if (editable()) {
                <app-ui-inline-edit
                  kind="number"
                  [min]="0"
                  [step]="1"
                  [value]="(entry()[m.field] ?? 0).toString()"
                  [ariaLabel]="'Edit ' + m.label"
                  (saved)="saveMacro(m.field, $event)"
                />
              } @else {
                <span class="nutrition-row__macro-value">{{ entry()[m.field] ?? 0 }}</span>
              }
              <span class="nutrition-row__macro-unit">{{ m.unit }}</span>
            </span>
          }
        }
      </span>

      @if (editable()) {
        <app-ui-button
          variant="ghost"
          size="sm"
          [iconOnly]="true"
          ariaLabel="Remove entry"
          (pressed)="remove.emit(entry().id)"
        >
          <app-icon name="delete" />
        </app-ui-button>
      }
    </div>
  `,
  styles: [`
    .nutrition-row {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      font-size: 0.82rem;
    }

    .nutrition-row__time {
      flex: 0 0 auto;
      color: var(--color-text-soft, var(--color-text-muted));
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }

    .nutrition-row__text {
      flex: 1 1 auto;
      min-width: 0;
      display: flex;
    }

    .nutrition-row__macros {
      flex: 0 0 auto;
      display: flex;
      align-items: center;
      gap: 0.55rem;
      color: var(--color-text-muted);
      font-variant-numeric: tabular-nums;
    }

    .nutrition-row__macro {
      display: inline-flex;
      align-items: baseline;
      gap: 0.15rem;
    }

    /* Calories lead, macros read as a quieter trailing group. */
    .nutrition-row__macro--kcal {
      color: var(--color-text);
      font-weight: 600;
    }

    .nutrition-row__macro-unit {
      font-size: 0.7rem;
      opacity: 0.7;
    }

    /* Give inline number fields a sensible width inside the dense row. */
    .nutrition-row__macro app-ui-inline-edit {
      flex: 0 0 auto;
      width: 3.2rem;
    }

    .nutrition-row__pending {
      font-size: 0.72rem;
      font-style: italic;
      color: var(--color-text-soft, var(--color-text-muted));
      opacity: 0.85;
    }
  `],
})
export class NutritionRow {
  readonly entry = input.required<FoodLogEntry>();
  readonly editable = input<boolean>(false);

  readonly patch = output<NutritionRowPatch>();
  readonly remove = output<string>();

  protected readonly time = computed(() => formatLondonTime(this.entry().logged_at));

  // Null kcal ⟺ the entry hasn't been estimated yet (Jimbo enriches async).
  // The estimator always writes a number, so null is an unambiguous pending marker.
  protected readonly pending = computed(() => this.entry().est_kcal === null);

  // Declared once so read + edit modes render the same field order.
  protected readonly macros = computed(() => MACRO_FIELDS);

  protected saveText(value: string): void {
    const raw_text = value.trim();
    if (raw_text && raw_text !== this.entry().raw_text) {
      this.patch.emit({ id: this.entry().id, changes: { raw_text } });
    }
  }

  protected saveMacro(field: MacroField, value: string): void {
    const n = Math.round(Number(value));
    if (!Number.isFinite(n) || n < 0) return;
    if (n === (this.entry()[field] ?? 0)) return;
    // Indexing a typed Partial keeps this assignment sound without a cast.
    const changes: Partial<FoodLogEntry> = {};
    changes[field] = n;
    this.patch.emit({ id: this.entry().id, changes });
  }
}

interface MacroFieldDef {
  readonly field: MacroField;
  readonly label: string;
  readonly unit: string;
}

const MACRO_FIELDS: readonly MacroFieldDef[] = [
  { field: 'est_kcal', label: 'calories', unit: 'kcal' },
  { field: 'est_protein_g', label: 'protein', unit: 'p' },
  { field: 'est_carbs_g', label: 'carbs', unit: 'c' },
  { field: 'est_fat_g', label: 'fat', unit: 'f' },
];

// London HH:MM for an entry timestamp. Mirrors NutritionDaySection.formatTime.
function formatLondonTime(ts: string): string {
  return new Date(ts).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/London',
  });
}
