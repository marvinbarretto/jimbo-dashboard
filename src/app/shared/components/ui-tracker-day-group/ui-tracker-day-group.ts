import { ChangeDetectionStrategy, Component, computed, input, linkedSignal, output } from '@angular/core';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiTrackerRow } from '@shared/components/ui-tracker-row/ui-tracker-row';
import { UiQuickAddRow, type QuickAddOption } from '@shared/components/ui-quick-add-row/ui-quick-add-row';
import {
  sumMeasures,
  type TrackerDraft,
  type TrackerEntry,
  type TrackerMeasure,
  type TrackerPatch,
} from '@shared/components/tracker/tracker.types';
import { londonToday, relativeDayLabel } from '@shared/utils/datetime.utils';

/**
 * A single day's slice of a tracker: a collapsible section headed by the day +
 * its per-measure totals, a list of {@link UiTrackerRow}, and (when editable) a
 * {@link UiQuickAddRow} that backdates new entries to this day.
 *
 * Presentational — entries come in, edits go out via `(patch)`/`(remove)`/`(add)`.
 * The host owns fetching and persistence; this just composes the day view, so
 * it serves nutrition today and project-work/hydration tomorrow unchanged.
 */
@Component({
  selector: 'app-ui-tracker-day-group',
  imports: [UiSection, UiTrackerRow, UiQuickAddRow],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-ui-section
      [title]="heading()"
      [meta]="metaText()"
      [expanded]="open()"
      (toggled)="open.set(!open())"
    >
      <div class="day-group">
        @for (e of entries(); track e.id) {
          <app-ui-tracker-row
            [entry]="e"
            [measures]="measures()"
            [editable]="editable()"
            (patch)="patch.emit($event)"
            (remove)="remove.emit($event)"
          />
        } @empty {
          <p class="day-group__empty">{{ emptyMessage() }}</p>
        }

        @if (editable() && showQuickAdd()) {
          <app-ui-quick-add-row
            class="day-group__add"
            [measures]="quickAddMeasures()"
            [options]="quickAddOptions()"
            [suggestions]="quickAddSuggestions()"
            [allowCreate]="quickAddAllowCreate()"
            [instantCommit]="quickAddInstantCommit()"
            [placeholder]="quickAddPlaceholder()"
            [addLabel]="quickAddLabel()"
            [kind]="quickAddKind()"
            [defaultDate]="backdate()"
            (add)="add.emit($event)"
          />
        }
      </div>
    </app-ui-section>
  `,
  styles: [`
    .day-group {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .day-group__empty {
      margin: 0;
      font-size: 0.8rem;
      font-style: italic;
      color: var(--color-text-muted);
    }

    .day-group__add {
      margin-top: 0.35rem;
      padding-top: 0.5rem;
      border-top: 1px dashed color-mix(in srgb, var(--color-border) 55%, transparent);
    }

    /* Mobile rows are two lines tall — whitespace, not borders, keeps them
       reading as separate entries. */
    @media (max-width: 768px) {
      .day-group {
        gap: 1rem;
      }
    }
  `],
})
export class UiTrackerDayGroup {
  /** London calendar day, YYYY-MM-DD. */
  readonly date = input.required<string>();
  /** Override the computed "Today / Yesterday / Wed 25 Jun" heading. */
  readonly label = input<string | undefined>(undefined);
  readonly entries = input.required<readonly TrackerEntry[]>();
  readonly measures = input.required<readonly TrackerMeasure[]>();
  readonly editable = input<boolean>(false);

  readonly showQuickAdd = input<boolean>(true);
  readonly quickAddMeasures = input<readonly TrackerMeasure[]>([]);
  readonly quickAddOptions = input<readonly QuickAddOption[]>([]);
  readonly quickAddSuggestions = input<readonly string[]>([]);
  readonly quickAddAllowCreate = input<boolean>(false);
  readonly quickAddInstantCommit = input<boolean>(false);
  readonly quickAddPlaceholder = input<string>('add an entry…');
  readonly quickAddLabel = input<string>('Add');
  readonly quickAddKind = input<string | undefined>(undefined);

  /** Initial expanded state; user toggles override it until `date` changes. */
  readonly expanded = input<boolean>(true);
  readonly emptyMessage = input<string>('Nothing logged.');

  readonly patch = output<TrackerPatch>();
  readonly remove = output<string>();
  readonly add = output<TrackerDraft>();

  protected readonly open = linkedSignal(() => this.expanded());

  // Quick-add backdates to the group day unless the day is today, where "now"
  // (an omitted timestamp → server now()) reads more naturally than midday.
  protected readonly backdate = computed(() =>
    this.date() === londonToday() ? undefined : this.date(),
  );

  protected readonly totals = computed(() => sumMeasures([...this.entries()], this.measures()));

  protected readonly heading = computed(() => this.label() ?? relativeDayLabel(this.date()));

  protected readonly metaText = computed(() => {
    const n = this.entries().length;
    if (n === 0) return 'nothing logged';
    const t = this.totals();
    const primaries = this.measures().filter((m) => m.primary);
    const sums = (primaries.length ? primaries : this.measures().slice(0, 1))
      .map((m) => `${Math.round(t[m.key] ?? 0)} ${m.unit ?? m.label}`.trim())
      .join(' · ');
    return `${n} ${n === 1 ? 'entry' : 'entries'}${sums ? ` · ${sums}` : ''}`;
  });
}

