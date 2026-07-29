import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { AppIcon } from '@shared/components/app-icon/app-icon';
import { UiButton } from '@shared/components/ui-button/ui-button';
import { UiInlineEdit } from '@shared/components/ui-inline-edit/ui-inline-edit';
import { LondonTimePipe } from '@shared/pipes/london-time.pipe';
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
 * One tracker entry as a row: `time · [kind] · label · measures · ⋯`. Read mode
 * is static text; edit mode swaps the time, label, and each editable measure for
 * inline editors and exposes a remove affordance.
 *
 * The row only renders the measures an entry actually carries (`measuresFor`),
 * so a single day group can interleave heterogeneous kinds (food shows macros,
 * a supplement shows its dose) without per-kind components.
 *
 * Presentational: it owns no canonical state. Edits emit `(patch)` with the
 * changed fields; the host persists them and feeds the fresh `entry` back in.
 */
@Component({
  selector: 'app-ui-tracker-row',
  imports: [AppIcon, UiButton, UiInlineEdit, LondonTimePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tracker-row" [class.tracker-row--editable]="editable()">
      @if (showTime()) {
        <span class="tracker-row__time">
          @if (editable() && rowEditable()) {
            <app-ui-inline-edit
              kind="datetime"
              [value]="timeInput()"
              [displayFor]="displayTime"
              ariaLabel="Edit time"
              (saved)="saveTime($event)"
            />
          } @else {
            {{ entry().at | londonTime }}
          }
        </span>
      }

      @if (entry().kind; as k) {
        <span class="tracker-row__kind" [attr.data-kind]="k">{{ k }}</span>
      }

      <span class="tracker-row__label">
        @if (editable() && rowEditable() && labelEditable()) {
          <app-ui-inline-edit
            [value]="entry().label"
            ariaLabel="Edit label"
            [placeholder]="labelPlaceholder()"
            (saved)="saveLabel($event)"
          />
        } @else {
          {{ entry().label }}
        }
      </span>

      <span class="tracker-row__measures" aria-label="measures">
        @if (entry().pending && !editable()) {
          <span class="tracker-row__pending" title="Awaiting estimate">estimating…</span>
        } @else {
          @for (m of shownMeasures(); track m.key) {
            <span class="tracker-row__measure" [class.tracker-row__measure--primary]="m.primary">
              @if (editable() && rowEditable() && (m.editable ?? true)) {
                <app-ui-inline-edit
                  kind="number"
                  size="lg"
                  [min]="0"
                  [step]="m.kind === 'number' ? 0.1 : 1"
                  [value]="valueText(m)"
                  [ariaLabel]="'Edit ' + m.label"
                  (saved)="saveMeasure(m, $event)"
                />
              } @else {
                <span class="tracker-row__measure-value">{{ valueText(m) }}</span>
              }
              @if (unitFor(m); as u) {
                <span class="tracker-row__measure-unit">{{ u }}</span>
              }
            </span>
          }
        }
      </span>

      @if (editable() && rowEditable()) {
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
    .tracker-row {
      display: flex;
      align-items: center;
      gap: 0.7rem;
      font-size: 0.86rem;
    }

    .tracker-row__time {
      flex: 0 0 auto;
      min-width: 3.1rem;
      color: var(--color-text-soft, var(--color-text-muted));
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
    .tracker-row--editable .tracker-row__time { min-width: 9.5rem; }

    .tracker-row__kind {
      flex: 0 0 auto;
      font-size: 0.62rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 0.05rem 0.3rem;
      border-radius: var(--radius);
      color: var(--color-text-muted);
      border: 1px solid color-mix(in srgb, var(--color-border) 70%, transparent);
    }
    .tracker-row__kind[data-kind='supplement'] {
      color: var(--color-info);
      border-color: color-mix(in srgb, var(--color-info) 45%, transparent);
    }

    .tracker-row__label {
      flex: 1 1 auto;
      min-width: 0;
      display: flex;
    }

    .tracker-row__measures {
      flex: 0 0 auto;
      display: flex;
      align-items: center;
      gap: 0.55rem;
      color: var(--color-text-muted);
      font-variant-numeric: tabular-nums;
    }

    .tracker-row__measure {
      display: inline-flex;
      align-items: baseline;
      gap: 0.15rem;
    }
    .tracker-row__measure--primary {
      color: var(--color-text);
      font-weight: 600;
    }

    .tracker-row__measure-unit { font-size: 0.7rem; opacity: 0.7; }

    .tracker-row__measure app-ui-inline-edit {
      flex: 0 0 auto;
      width: 4rem;
    }

    .tracker-row__pending {
      font-size: 0.72rem;
      font-style: italic;
      color: var(--color-text-soft, var(--color-text-muted));
      opacity: 0.85;
    }

    @media (max-width: 768px) {
      .tracker-row {
        flex-wrap: wrap;
        gap: 0.35rem 0.5rem;
        padding: 0.45rem 0;
      }

      .tracker-row__time {
        min-width: auto;
        font-size: 0.78rem;
      }
      .tracker-row--editable .tracker-row__time {
        min-width: auto;
        flex: 0 0 auto;
      }

      .tracker-row__label {
        flex: 1 1 0;
        min-width: 6rem;
      }

      .tracker-row__measures {
        flex: 0 0 auto;
        gap: 0.4rem;
        flex-wrap: wrap;
      }

      .tracker-row__measure app-ui-inline-edit {
        width: 3.5rem;
      }
    }
  `],
})
export class UiTrackerRow {
  readonly entry = input.required<TrackerEntry>();
  readonly measures = input.required<readonly TrackerMeasure[]>();
  readonly editable = input<boolean>(false);
  readonly labelPlaceholder = input<string>('label…');
  /** Show the leading time column. Off for sub-entries that aren't independently timed (e.g. a set within a session). */
  readonly showTime = input<boolean>(true);

  readonly patch = output<TrackerPatch>();
  readonly remove = output<string>();

  protected readonly timeInput = computed(() => isoToLocalInput(this.entry().at));

  // The day group shows the date — the row only needs HH:MM. The picker still
  // edits the full London datetime when clicked.
  protected readonly displayTime = (v: string): string => (v.length >= 16 ? v.slice(11, 16) : v);
  protected readonly rowEditable = computed(() => this.entry().editable ?? true);
  protected readonly labelEditable = computed(() => this.entry().labelEditable ?? true);
  protected readonly shownMeasures = computed(() => measuresFor(this.entry(), this.measures()));

  protected valueText(m: TrackerMeasure): string {
    const v = this.entry().values[m.key];
    return typeof v === 'number' ? String(v) : '0';
  }

  /** Per-entry unit override (e.g. a supplement's dose unit) wins over the measure's. */
  protected unitFor(m: TrackerMeasure): string {
    return this.entry().units?.[m.key] ?? m.unit ?? '';
  }

  protected saveLabel(value: string): void {
    const label = value.trim();
    if (label && label !== this.entry().label) {
      this.patch.emit({ id: this.entry().id, changes: { label } });
    }
  }

  protected saveTime(local: string): void {
    const at = localInputToIso(local);
    if (at && at !== this.entry().at) {
      this.patch.emit({ id: this.entry().id, changes: { at } });
    }
  }

  protected saveMeasure(m: TrackerMeasure, value: string): void {
    const n = roundForMeasure(m, Number(value));
    if (!Number.isFinite(n) || n < 0) return;
    if (n === (this.entry().values[m.key] ?? 0)) return;
    this.patch.emit({ id: this.entry().id, changes: { values: { [m.key]: n } } });
  }
}
