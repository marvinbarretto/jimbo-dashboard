import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { UiButton } from '@shared/components/ui-button/ui-button';
import { UiSheet } from '@shared/components/ui-sheet/ui-sheet';
import {
  isoToLocalInput,
  localInputToIso,
  measuresFor,
  roundForMeasure,
  type TrackerEntry,
  type TrackerMeasure,
  type TrackerPatch,
} from '@shared/components/tracker/tracker.types';

/**
 * Sheet editor for one tracker entry — the mobile counterpart to
 * {@link UiTrackerRow}'s inline editing. Rows stay read-only displays; tapping
 * one opens this sheet with real full-width form fields (native controls get a
 * surface designed for them instead of morphing inside a dense row).
 *
 * Measure-driven like the row: primary measures render as hero fields,
 * the rest as a grid, so nutrition (kcal + macros), supplements (dose), and
 * future trackers all get the same editor for free.
 *
 * Presentational: emits one consolidated `(patch)` with only the changed
 * fields on save, `(remove)` on delete, `(closed)` always when done.
 */
@Component({
  selector: 'app-ui-tracker-edit-sheet',
  imports: [ReactiveFormsModule, UiButton, UiSheet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-ui-sheet heading="Edit entry" (closed)="closed.emit()">
      <form [formGroup]="form" (ngSubmit)="save()">
        <label class="edit-sheet__field">
          <span class="edit-sheet__label">What</span>
          <input class="edit-sheet__input" type="text" formControlName="label" />
        </label>

        <label class="edit-sheet__field">
          <span class="edit-sheet__label">When</span>
          <input class="edit-sheet__input edit-sheet__input--datetime" type="datetime-local" formControlName="at" />
        </label>

        <div formGroupName="values">
          @for (m of heroMeasures(); track m.key) {
            <label class="edit-sheet__field">
              <span class="edit-sheet__label">{{ m.label }}</span>
              <span class="edit-sheet__num edit-sheet__num--hero">
                <input
                  type="number"
                  inputmode="numeric"
                  min="0"
                  [attr.step]="m.kind === 'number' ? 0.1 : 1"
                  [formControlName]="m.key"
                  [attr.aria-label]="m.label"
                />
                @if (unitFor(m); as u) {
                  <span class="edit-sheet__unit">{{ u }}</span>
                }
              </span>
            </label>
          }

          @if (gridMeasures().length) {
            <div class="edit-sheet__grid" role="group" aria-label="Measures">
              @for (m of gridMeasures(); track m.key) {
                <span class="edit-sheet__num">
                  <input
                    type="number"
                    inputmode="numeric"
                    min="0"
                    [attr.step]="m.kind === 'number' ? 0.1 : 1"
                    [formControlName]="m.key"
                    [attr.aria-label]="m.label"
                  />
                  @if (unitFor(m); as u) {
                    <span class="edit-sheet__unit">{{ u }}</span>
                  }
                </span>
              }
            </div>
          }
        </div>

        <app-ui-button variant="primary" type="submit" [block]="true">Save</app-ui-button>
        <app-ui-button
          class="edit-sheet__delete"
          variant="danger"
          [bare]="true"
          [block]="true"
          (pressed)="deleteEntry()"
        >Delete entry</app-ui-button>
      </form>
    </app-ui-sheet>
  `,
  styles: [`
    .edit-sheet__field {
      display: block;
      margin-bottom: 0.85rem;
    }

    .edit-sheet__label {
      display: block;
      margin-bottom: 0.3rem;
      font-size: 0.68rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--color-text-muted);
    }

    .edit-sheet__input,
    .edit-sheet__num {
      display: flex;
      width: 100%;
      min-height: 3rem;
      align-items: center;
      padding: 0 0.75rem;
      font: inherit;
      font-size: 1.05rem;
      color: var(--color-text);
      background: var(--color-bg-elevated, transparent);
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
    }

    .edit-sheet__input:focus {
      outline: none;
      border-color: var(--color-accent);
    }

    .edit-sheet__input:disabled {
      opacity: 0.55;
    }

    .edit-sheet__input--datetime {
      font-variant-numeric: tabular-nums;
      min-width: 0;
      max-width: 100%;
    }

    /* number + unit read as one bound control */
    .edit-sheet__num {
      gap: 0.3rem;

      input {
        flex: 1 1 auto;
        min-width: 0;
        border: none;
        background: transparent;
        font: inherit;
        font-size: 1.05rem;
        color: var(--color-text);
        font-variant-numeric: tabular-nums;

        &:focus { outline: none; }
      }

      &:focus-within {
        border-color: var(--color-accent);
      }
    }

    .edit-sheet__num--hero input {
      font-size: 1.3rem;
      font-weight: 650;
    }

    .edit-sheet__unit {
      flex: 0 0 auto;
      font-size: 0.75rem;
      color: var(--color-text-muted);
    }

    .edit-sheet__grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(5rem, 1fr));
      gap: 0.6rem;
      margin-bottom: 0.85rem;
    }

    .edit-sheet__delete {
      margin-top: 0.5rem;
    }
  `],
})
export class UiTrackerEditSheet {
  readonly entry = input.required<TrackerEntry>();
  readonly measures = input.required<readonly TrackerMeasure[]>();

  readonly patch = output<TrackerPatch>();
  readonly remove = output<string>();
  readonly closed = output<void>();

  private readonly fb = inject(NonNullableFormBuilder);

  // Held separately: FormRecord's own add/removeControl are string-keyed,
  // while the same control reached through the group's type is not.
  private readonly valuesForm = this.fb.record<string>({});

  protected readonly form = this.fb.group({
    label: this.fb.control(''),
    at: this.fb.control(''),
    values: this.valuesForm,
  });

  private readonly shownMeasures = computed(() => measuresFor(this.entry(), this.measures()));
  protected readonly heroMeasures = computed(() =>
    this.shownMeasures().filter((m) => m.primary && (m.editable ?? true)),
  );
  protected readonly gridMeasures = computed(() =>
    this.shownMeasures().filter((m) => !m.primary && (m.editable ?? true)),
  );

  constructor() {
    // Rebuild the form whenever the target entry changes — the sheet instance
    // may be reused across opens (host @if survives if another row is tapped).
    effect(() => {
      const e = this.entry();
      const values = this.valuesForm;
      for (const key of Object.keys(values.controls)) values.removeControl(key, { emitEvent: false });
      for (const m of [...this.heroMeasures(), ...this.gridMeasures()]) {
        const v = e.values[m.key];
        values.addControl(m.key, this.fb.control(typeof v === 'number' ? String(v) : ''), { emitEvent: false });
      }
      this.form.controls.label.setValue(e.label);
      this.form.controls.at.setValue(isoToLocalInput(e.at));
      // Truly read-only fields (catalog names) disable rather than error.
      if (e.labelEditable === false) this.form.controls.label.disable();
      else this.form.controls.label.enable();
    });
  }

  protected unitFor(m: TrackerMeasure): string {
    return this.entry().units?.[m.key] ?? m.unit ?? '';
  }

  protected save(): void {
    const e = this.entry();
    const raw = this.form.getRawValue();
    const changes: { label?: string; at?: string; values?: Record<string, number | null> } = {};

    const label = raw.label.trim();
    if (label && label !== e.label && e.labelEditable !== false) changes.label = label;

    const at = localInputToIso(raw.at);
    if (at && at !== e.at) changes.at = at;

    const values: Record<string, number | null> = {};
    for (const m of [...this.heroMeasures(), ...this.gridMeasures()]) {
      // type="number" inputs coerce the control's value to number; init sets string.
      const text = String(raw.values[m.key] ?? '').trim();
      if (text === '') continue; // cleared field = no change, not zero
      const n = roundForMeasure(m, Number(text));
      if (!Number.isFinite(n) || n < 0) continue;
      if (n !== e.values[m.key]) values[m.key] = n;
    }
    if (Object.keys(values).length) changes.values = values;

    if (Object.keys(changes).length) {
      this.patch.emit({ id: e.id, changes });
    }
    this.closed.emit();
  }

  protected deleteEntry(): void {
    this.remove.emit(this.entry().id);
    this.closed.emit();
  }
}
