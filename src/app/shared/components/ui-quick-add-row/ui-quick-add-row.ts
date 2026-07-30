import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { UiButton } from '@shared/components/ui-button/ui-button';
import { UiTypeahead, type TypeaheadOption } from '@shared/components/ui-typeahead/ui-typeahead';
import { ViewportService } from '@shared/services/viewport.service';
import {
  localInputToIso,
  roundForMeasure,
  type TrackerDraft,
  type TrackerMeasure,
} from '@shared/components/tracker/tracker.types';

/** Catalog option for the typeahead label (e.g. the exercise/supplement catalog). */
export type QuickAddOption = TypeaheadOption;

const norm = (s: string): string => s.trim().toLowerCase();

/**
 * Todo-style inline capture: a {@link UiTypeahead} label (search a catalog, or
 * free-text a new entry when `allowCreate`) plus a compact number field per
 * quick-add measure, committed on Enter or the add button. The one genuinely new
 * tracker primitive — it gives the page its "type a thing, hit enter, it
 * appears, refine inline later" feel.
 *
 * Emits a {@link TrackerDraft}; the host persists it. When `defaultDate` is set
 * (a past day group) the draft is timestamped at midday that day so it lands on
 * the right day; otherwise `at` is omitted and the server stamps now.
 */
@Component({
  selector: 'app-ui-quick-add-row',
  imports: [UiButton, UiTypeahead],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Instant-commit rows are pure capture (numbers arrive via async estimate /
  // sheet refinement), so mobile collapses them to a single text field.
  host: { '[class.quick-add-host--capture]': 'instantCommit()' },
  template: `
    <div class="quick-add-block">
    <div class="quick-add">
      <app-ui-typeahead
        class="quick-add__label"
        [(query)]="query"
        [options]="typeaheadOptions()"
        [allowCreate]="allowCreate()"
        [placeholder]="placeholder()"
        [ariaLabel]="labelAria()"
        (pick)="onPick($event)"
        (create)="onCreate($event)"
      />

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
        [size]="viewport.isMobile() ? 'md' : 'sm'"
        ariaLabel="Add entry"
        [disabled]="!canAdd()"
        (pressed)="commit()"
      >
        {{ addLabel() }}
      </app-ui-button>
    </div>

    @if (activeHint(); as hint) {
      <p class="quick-add__hint">{{ hint }}</p>
    }
    </div>
  `,
  styles: [`
    .quick-add {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      font-size: 0.86rem;
      padding: 0.2rem 0;
    }

    .quick-add__label {
      flex: 1 1 auto;
      min-width: 0;
    }

    .quick-add__measure {
      flex: 0 0 auto;
      display: inline-flex;
      align-items: baseline;
      gap: 0.15rem;
    }

    .quick-add__num {
      width: 4.4rem;
      font: inherit;
      font-variant-numeric: tabular-nums;
      color: var(--color-text);
      background: var(--color-surface-soft, transparent);
      border: 1px solid color-mix(in srgb, var(--color-border) 60%, transparent);
      border-radius: var(--radius);
      padding: 0.4rem 0.5rem;

      &::placeholder { color: var(--color-text-muted); opacity: 0.6; }
      &:focus { outline: none; border-color: var(--color-accent); }
    }

    .quick-add__unit { font-size: 0.7rem; opacity: 0.7; color: var(--color-text-muted); }

    .quick-add__hint {
      margin: 0.1rem 0 0;
      font-size: 0.74rem;
      color: var(--color-text-muted);
    }

    @media (max-width: 768px) {
      /* 1rem stops iOS focus-zoom (the typeahead input inherits font). */
      .quick-add {
        font-size: 1rem;
      }

      /* Capture rows: one thumb, one field — measure inputs disappear and the
         numbers arrive via the async estimate (refine in the edit sheet). */
      :host(.quick-add-host--capture) .quick-add__measure {
        display: none;
      }
    }
  `],
})
export class UiQuickAddRow {
  /** Number fields offered for quick capture (often a subset of the group's measures). */
  readonly measures = input<readonly TrackerMeasure[]>([]);
  /** Catalog the typeahead searches over (e.g. exercises/supplements), id-bearing. */
  readonly options = input<readonly QuickAddOption[]>([]);
  /** Free-text autocomplete hints when there's no id-bearing catalog (e.g. frequent foods). */
  readonly suggestions = input<readonly string[]>([]);
  /** Offer a "+ Create" path for labels not in the catalog (the draft carries no ref). */
  readonly allowCreate = input<boolean>(false);
  /** Commit the row the instant a label is picked/created, skipping the Add button (e.g. food). */
  readonly instantCommit = input<boolean>(false);
  readonly placeholder = input<string>('add an entry…');
  readonly labelAria = input<string>('New entry');
  readonly addLabel = input<string>('Add');
  /** YYYY-MM-DD this row adds to; omit for "now". Backdates retrospective adds. */
  readonly defaultDate = input<string | undefined>(undefined);
  /** Default kind stamped on the draft (e.g. 'food' | 'supplement'). */
  readonly kind = input<string | undefined>(undefined);
  /**
   * Per-option default measure values (option id → values), applied on pick.
   * Anything the user already typed wins; picking a different option replaces
   * only the values a previous pick auto-filled.
   */
  readonly prefill = input<Readonly<Record<string, Readonly<Record<string, number>>>>>({});
  /**
   * Per-option context line (option id → text) shown under the row while the
   * label resolves to that option — e.g. "Last time: 2×10×25 kg @ RPE 6".
   */
  readonly hints = input<Readonly<Record<string, string>>>({});

  readonly add = output<TrackerDraft>();

  protected readonly viewport = inject(ViewportService);

  /** The typeahead's visible text — the label source of truth (two-way bound). */
  protected readonly query = signal('');
  protected readonly values = signal<Record<string, number>>({});
  // Keys whose current value came from prefill, not the user — the set a later
  // pick is allowed to overwrite.
  private readonly autoFilled = signal<ReadonlySet<string>>(new Set());

  // Id-bearing catalog → resolve picks to a ref; free-text suggestions get no ref.
  private readonly refMode = computed(() => this.options().length > 0);

  protected readonly typeaheadOptions = computed<readonly QuickAddOption[]>(() => {
    const opts = this.options();
    if (opts.length) return opts;
    return this.suggestions().map((s) => ({ id: s, label: s }));
  });

  // Free text is addable when allowed; otherwise it must resolve to a real option.
  protected readonly canAdd = computed(() => {
    const q = this.query().trim();
    if (!q) return false;
    if (this.refMode() && !this.allowCreate()) {
      return this.options().some((o) => norm(o.label) === norm(q));
    }
    return true;
  });

  // The option the current query text resolves to (how commit() will read it).
  private readonly matchedId = computed<string | undefined>(() => {
    const q = norm(this.query());
    return q ? this.options().find((o) => norm(o.label) === q)?.id : undefined;
  });

  protected readonly activeHint = computed<string | undefined>(() => {
    const id = this.matchedId();
    return id ? this.hints()[id] : undefined;
  });

  protected onPick(option: QuickAddOption): void {
    this.query.set(option.label);
    this.applyPrefill(option.id);
    if (this.instantCommit()) this.commit();
  }

  private applyPrefill(optionId: string): void {
    const defaults = this.prefill()[optionId] ?? {};
    // Drop stale auto-fills from a previous pick, then lay in the new ones —
    // never touching a value the user typed themselves.
    const next = { ...this.values() };
    for (const key of this.autoFilled()) delete next[key];
    const nowAuto = new Set<string>();
    for (const m of this.measures()) {
      const d = defaults[m.key];
      if (d !== undefined && next[m.key] === undefined) {
        next[m.key] = d;
        nowAuto.add(m.key);
      }
    }
    this.values.set(next);
    this.autoFilled.set(nowAuto);
  }

  protected onCreate(text: string): void {
    this.query.set(text);
    if (this.instantCommit()) this.commit();
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
    // Touched by hand — no longer a prefill's to overwrite.
    this.autoFilled.update((s) => {
      if (!s.has(key)) return s;
      const next = new Set(s);
      next.delete(key);
      return next;
    });
  }

  protected commit(): void {
    if (!this.canAdd()) return;

    // Resolve text → option at commit time (case/space-insensitive) so what the
    // user sees is what's logged; an unmatched label is a free-text/new entry.
    const q = this.query().trim();
    const match = this.options().find((o) => norm(o.label) === norm(q));
    const label = match?.label ?? q;
    const ref = this.refMode() ? match?.id : undefined;

    const raw = this.values();
    const values: Record<string, number> = {};
    for (const m of this.measures()) {
      const v = raw[m.key];
      if (typeof v === 'number') values[m.key] = roundForMeasure(m, v);
    }

    const date = this.defaultDate();
    const at = date ? (localInputToIso(`${date}T12:00`) ?? undefined) : undefined;

    this.add.emit({ label, at, values, kind: this.kind(), ref });
    this.reset();
  }

  private reset(): void {
    this.query.set('');
    this.values.set({});
    this.autoFilled.set(new Set());
  }
}
