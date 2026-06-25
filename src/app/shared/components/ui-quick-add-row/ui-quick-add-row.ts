import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { AppIcon } from '@shared/components/app-icon/app-icon';
import { UiButton } from '@shared/components/ui-button/ui-button';
import {
  localInputToIso,
  roundForMeasure,
  type TrackerDraft,
  type TrackerMeasure,
} from '@shared/components/tracker/tracker.types';

/** Catalog option for select-mode (e.g. the supplement catalog). */
export interface QuickAddOption {
  readonly id: string;
  readonly label: string;
}

let nextQuickAddId = 0;

/**
 * Todo-style inline capture: a label (free text, or a catalog select) plus a
 * compact number field per quick-add measure, committed on Enter or the add
 * button. The one genuinely new tracker primitive — it gives the page its
 * "type a thing, hit enter, it appears, refine inline later" feel.
 *
 * Emits a {@link TrackerDraft}; the host persists it. When `defaultDate` is set
 * (a past day group) the draft is timestamped at midday that day so it lands on
 * the right day; otherwise `at` is omitted and the server stamps now.
 */
@Component({
  selector: 'app-ui-quick-add-row',
  imports: [AppIcon, UiButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="quick-add">
      <span class="quick-add__lead" aria-hidden="true">
        <app-icon name="add" />
      </span>

      @if (options().length) {
        <select
          class="quick-add__label quick-add__select"
          [value]="ref()"
          [attr.aria-label]="labelAria()"
          (change)="onRef($any($event.target).value)"
        >
          <option value="">{{ placeholder() }}</option>
          @for (o of options(); track o.id) {
            <option [value]="o.id">{{ o.label }}</option>
          }
        </select>
      } @else {
        <input
          type="text"
          class="quick-add__label"
          [value]="label()"
          [placeholder]="placeholder()"
          [attr.aria-label]="labelAria()"
          [attr.list]="suggestions().length ? listId : null"
          (input)="label.set($any($event.target).value)"
          (keydown.enter)="commit()"
        />
        @if (suggestions().length) {
          <datalist [id]="listId">
            @for (s of suggestions(); track s) {
              <option [value]="s"></option>
            }
          </datalist>
        }
      }

      @for (m of measures(); track m.key) {
        <span class="quick-add__measure">
          <input
            type="number"
            inputmode="decimal"
            min="0"
            [attr.step]="m.kind === 'number' ? 0.1 : 1"
            class="quick-add__num"
            [value]="valueStr(m.key)"
            [attr.aria-label]="m.label"
            [attr.placeholder]="m.label"
            (input)="onValue(m.key, $any($event.target).value)"
            (keydown.enter)="commit()"
          />
          @if (m.unit) {
            <span class="quick-add__unit">{{ m.unit }}</span>
          }
        </span>
      }

      <app-ui-button
        variant="secondary"
        size="sm"
        ariaLabel="Add entry"
        [disabled]="!canAdd()"
        (pressed)="commit()"
      >
        {{ addLabel() }}
      </app-ui-button>
    </div>
  `,
  styles: [`
    .quick-add {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.82rem;
      padding: 0.15rem 0;
    }

    .quick-add__lead {
      flex: 0 0 auto;
      display: inline-flex;
      color: var(--color-text-muted);
      opacity: 0.7;
    }

    .quick-add__label {
      flex: 1 1 auto;
      min-width: 0;
      font: inherit;
      color: var(--color-text);
      background: var(--color-surface-soft, transparent);
      border: 1px solid color-mix(in srgb, var(--color-border) 60%, transparent);
      border-radius: var(--radius);
      padding: 0.28rem 0.45rem;

      &::placeholder { color: var(--color-text-muted); font-style: italic; }
      &:focus { outline: none; border-color: var(--color-accent); }
    }
    .quick-add__select { cursor: pointer; color-scheme: dark; }

    .quick-add__measure {
      flex: 0 0 auto;
      display: inline-flex;
      align-items: baseline;
      gap: 0.15rem;
    }

    .quick-add__num {
      width: 3.6rem;
      font: inherit;
      font-variant-numeric: tabular-nums;
      color: var(--color-text);
      background: var(--color-surface-soft, transparent);
      border: 1px solid color-mix(in srgb, var(--color-border) 60%, transparent);
      border-radius: var(--radius);
      padding: 0.28rem 0.35rem;

      &::placeholder { color: var(--color-text-muted); opacity: 0.6; }
      &:focus { outline: none; border-color: var(--color-accent); }
    }

    .quick-add__unit { font-size: 0.7rem; opacity: 0.7; color: var(--color-text-muted); }
  `],
})
export class UiQuickAddRow {
  /** Number fields offered for quick capture (often a subset of the group's measures). */
  readonly measures = input<readonly TrackerMeasure[]>([]);
  /** When non-empty, the label becomes a select over this catalog (e.g. supplements). */
  readonly options = input<readonly QuickAddOption[]>([]);
  /** Native autocomplete suggestions for the text label (e.g. your frequent foods). */
  readonly suggestions = input<readonly string[]>([]);
  readonly placeholder = input<string>('add an entry…');
  readonly labelAria = input<string>('New entry');
  readonly addLabel = input<string>('Add');
  /** YYYY-MM-DD this row adds to; omit for "now". Backdates retrospective adds. */
  readonly defaultDate = input<string | undefined>(undefined);
  /** Default kind stamped on the draft (e.g. 'food' | 'supplement'). */
  readonly kind = input<string | undefined>(undefined);

  readonly add = output<TrackerDraft>();

  protected readonly listId = `quick-add-list-${nextQuickAddId++}`;
  protected readonly label = signal('');
  protected readonly ref = signal('');
  protected readonly values = signal<Record<string, number>>({});

  private readonly selectMode = computed(() => this.options().length > 0);

  protected readonly canAdd = computed(() =>
    this.selectMode() ? this.ref() !== '' : this.label().trim().length > 0,
  );

  protected onRef(id: string): void {
    this.ref.set(id);
  }

  protected valueStr(key: string): string {
    const v = this.values()[key];
    return v === undefined ? '' : String(v);
  }

  protected onValue(key: string, raw: string): void {
    const n = Number(raw);
    this.values.update((v) => {
      const next = { ...v };
      if (raw === '' || !Number.isFinite(n)) delete next[key];
      else next[key] = n;
      return next;
    });
  }

  protected commit(): void {
    if (!this.canAdd()) return;

    const selected = this.selectMode()
      ? this.options().find((o) => o.id === this.ref())
      : undefined;
    const label = this.selectMode() ? (selected?.label ?? '') : this.label().trim();
    if (!label) return;

    const raw = this.values();
    const values: Record<string, number> = {};
    for (const m of this.measures()) {
      const v = raw[m.key];
      if (typeof v === 'number') values[m.key] = roundForMeasure(m, v);
    }

    const date = this.defaultDate();
    const at = date ? (localInputToIso(`${date}T12:00`) ?? undefined) : undefined;

    this.add.emit({ label, at, values, kind: this.kind(), ref: selected?.id });
    this.reset();
  }

  private reset(): void {
    this.label.set('');
    this.ref.set('');
    this.values.set({});
  }
}
