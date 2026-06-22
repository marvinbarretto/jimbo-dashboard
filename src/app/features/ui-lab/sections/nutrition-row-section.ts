import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UiButton } from '@shared/components/ui-button/ui-button';
import { UiCluster } from '@shared/components/ui-cluster/ui-cluster';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiStatCard } from '@shared/components/ui-stat-card/ui-stat-card';
import { UiSubhead } from '@shared/components/ui-subhead/ui-subhead';
import { NutritionRow, type NutritionRowPatch } from '@features/nutrition/components/nutrition-row/nutrition-row';
import type { FoodLogEntry } from '@features/nutrition/data-access/nutrition.service';

// Fixed timestamps keep the demo deterministic (no ambient clock). London day.
const DEMO_ENTRIES: readonly FoodLogEntry[] = [
  mock('food_a1', '08:15', 'porridge with banana and honey', 320, 9, 58, 6),
  mock('food_b2', '13:05', 'chicken caesar wrap, packet of crisps', 610, 34, 52, 28),
  mock('food_c3', '16:40', 'flat white + almond croissant', 410, 8, 41, 24),
];

/**
 * Smart nutrition row — read-only display and in-place editing of a food-log
 * entry, with a totals bar that recomputes live. Demonstrates the interaction
 * the nutrition page will use: edit a macro inline → totals move; add an entry
 * retrospectively → totals move; remove → totals move. All client-side here.
 */
@Component({
  selector: 'app-nutrition-row-section',
  imports: [
    ReactiveFormsModule,
    NutritionRow,
    UiButton,
    UiCluster,
    UiSection,
    UiStack,
    UiStatCard,
    UiSubhead,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../lab-utils.scss'],
  template: `
    <app-ui-section title="Nutrition Row" [collapsible]="false">
      <app-ui-stack gap="lg">
        <p class="ui-lab__support-copy">
          One food-log entry per row. Read mode mirrors the journal/nutrition list
          (time · text · macros). Edit mode swaps each field for an inline editor
          (<code>raw_text</code> as text, macros as <code>number</code>) plus a remove
          control. Totals are a <code>computed()</code> over the entries signal — every
          edit, add, or remove recalculates them live.
        </p>
        <p class="ui-lab__support-copy">
          <strong>Retrospective add</strong> takes free text + a time and inserts an entry
          <em>immediately, with macros pending</em> — add never blocks or fails on the LLM.
          Jimbo enriches it out-of-band on the coach <code>tick</code> (Hermes cron), the 60s
          poll surfaces the filled macros, and they're editable inline to override a bad guess.
          Pending rows show <em>estimating…</em> and are excluded from totals. The
          “Run Jimbo tick” button below stands in for the cron (stubbed estimator, no backend).
        </p>

        <!-- Live totals, same quartet the day view shows -->
        <div class="ui-lab__stat-card-grid nutrition-row-demo__totals">
          <app-ui-stat-card label="Calories" [value]="totals().kcal.toString()" detail="kcal" />
          <app-ui-stat-card label="Protein" [value]="totals().protein_g.toString()" detail="g" />
          <app-ui-stat-card label="Carbs" [value]="totals().carbs_g.toString()" detail="g" />
          <app-ui-stat-card label="Fat" [value]="totals().fat_g.toString()" detail="g" />
        </div>

        <app-ui-cluster gap="sm" justify="between">
          @if (pendingCount() > 0) {
            <span class="nutrition-row-demo__pending-note">
              +{{ pendingCount() }} estimating · excluded from totals
            </span>
          } @else {
            <span class="nutrition-row-demo__pending-note">all entries estimated</span>
          }
          <app-ui-button
            variant="secondary"
            size="sm"
            [disabled]="pendingCount() === 0"
            (pressed)="runEnrichmentTick()"
          >
            Run Jimbo tick ({{ pendingCount() }})
          </app-ui-button>
        </app-ui-cluster>

        <div>
          <app-ui-subhead label="Entries (editable)" [count]="entries().length" />
          <ul class="nutrition-row-demo__list">
            @for (e of entries(); track e.id) {
              <li>
                <app-nutrition-row
                  [entry]="e"
                  [editable]="true"
                  (patch)="applyPatch($event)"
                  (remove)="removeEntry($event)"
                />
              </li>
            }
          </ul>
        </div>

        <!-- Retrospective add — free text + time only; macros are estimated. -->
        @if (adding()) {
          <form class="nutrition-row-demo__add" [formGroup]="form" (ngSubmit)="addEntry()">
            <div class="nutrition-row-demo__add-grid">
              <label class="ui-lab__inline-label">
                Time
                <input class="nutrition-row-demo__input" type="time" formControlName="time" />
              </label>
              <label class="ui-lab__inline-label nutrition-row-demo__add-text">
                Food / drink
                <input class="nutrition-row-demo__input" type="text" formControlName="raw_text"
                       placeholder="e.g. greek yoghurt with berries" />
              </label>
            </div>
            <p class="ui-lab__support-copy nutrition-row-demo__hint">
              Saves instantly with macros <em>pending</em> — Jimbo estimates them on the next
              tick, then you can adjust any value inline.
            </p>
            <app-ui-cluster gap="sm" justify="end">
              <app-ui-button variant="ghost" size="sm" (pressed)="cancelAdd()">Cancel</app-ui-button>
              <app-ui-button variant="primary" size="sm" type="submit">Add entry</app-ui-button>
            </app-ui-cluster>
          </form>
        } @else {
          <app-ui-cluster gap="sm">
            <app-ui-button variant="secondary" size="sm" (pressed)="startAdd()">
              + Add entry retrospectively
            </app-ui-button>
          </app-ui-cluster>
        }

        <div>
          <app-ui-subhead label="Read-only (journal embed)" />
          <ul class="nutrition-row-demo__list">
            @for (e of entries(); track e.id) {
              <li><app-nutrition-row [entry]="e" /></li>
            }
          </ul>
        </div>
      </app-ui-stack>
    </app-ui-section>
  `,
  styles: [`
    .nutrition-row-demo__totals {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    .nutrition-row-demo__list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .nutrition-row-demo__list > li {
      padding: 0.3rem 0.4rem;
      border-radius: var(--radius);
    }

    .nutrition-row-demo__list > li:hover {
      background: color-mix(in srgb, var(--color-accent) 4%, transparent);
    }

    .nutrition-row-demo__add {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      padding: 1rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      background: var(--color-surface-soft);
    }

    .nutrition-row-demo__add-grid {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 0.6rem;
      align-items: end;
    }

    .nutrition-row-demo__add-text { min-width: 0; }

    .nutrition-row-demo__hint {
      margin: 0;
      font-size: 0.78rem;
    }

    .nutrition-row-demo__pending-note {
      font-size: 0.78rem;
      color: var(--color-text-muted);
      font-variant-numeric: tabular-nums;
    }

    .ui-lab__inline-label {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .nutrition-row-demo__input {
      font: inherit;
      padding: 0.3rem 0.4rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      background: var(--color-bg);
      color: var(--color-text);
    }

    @media (max-width: 768px) {
      .nutrition-row-demo__totals { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .nutrition-row-demo__add-grid { grid-template-columns: 1fr; }
    }
  `],
})
export class NutritionRowSection {
  private readonly fb = inject(FormBuilder);

  protected readonly entries = signal<FoodLogEntry[]>([...DEMO_ENTRIES]);
  protected readonly adding = signal(false);

  // Free text + time only — macros are estimated on save, not typed.
  protected readonly form = this.fb.nonNullable.group({
    time: ['12:00', Validators.required],
    raw_text: ['', Validators.required],
  });

  // Pending (un-estimated) rows are excluded from totals — a null est is "not
  // counted yet", not zero — and surfaced separately so the day total never
  // silently understates.
  protected readonly totals = computed(() =>
    this.entries().reduce(
      (acc, e) => ({
        kcal: acc.kcal + (e.est_kcal ?? 0),
        protein_g: acc.protein_g + (e.est_protein_g ?? 0),
        carbs_g: acc.carbs_g + (e.est_carbs_g ?? 0),
        fat_g: acc.fat_g + (e.est_fat_g ?? 0),
      }),
      { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
    ),
  );

  protected readonly pendingCount = computed(
    () => this.entries().filter(e => e.est_kcal === null).length,
  );

  protected applyPatch({ id, changes }: NutritionRowPatch): void {
    this.entries.update(xs => xs.map(e => (e.id === id ? { ...e, ...changes } : e)));
  }

  protected removeEntry(id: string): void {
    this.entries.update(xs => xs.filter(e => e.id !== id));
  }

  // Stand-in for the server-side enrichment the coach `tick` will run (called by
  // Hermes cron): find pending rows, estimate, fill them. On the real page this
  // happens out-of-band and the 60s poll surfaces it; the button just makes the
  // async step observable in the lab.
  protected runEnrichmentTick(): void {
    this.entries.update(xs =>
      xs.map(e => (e.est_kcal === null ? { ...e, ...estimateMacros(e.raw_text) } : e)),
    );
  }

  protected startAdd(): void {
    this.adding.set(true);
  }

  protected cancelAdd(): void {
    this.adding.set(false);
    this.form.reset({ time: '12:00', raw_text: '' });
  }

  protected addEntry(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const raw_text = v.raw_text.trim();
    // Insert PENDING — macros null. Real path: POST returns instantly, Jimbo's
    // tick estimates later. No estimate happens at add time.
    const entry: FoodLogEntry = {
      id: `food_demo_${this.entries().length}_${v.time.replace(':', '')}`,
      logged_at: `2026-06-22T${v.time}:00Z`,
      raw_text,
      items: [],
      est_kcal: null,
      est_protein_g: null,
      est_carbs_g: null,
      est_fat_g: null,
      source: 'in_app',
    };
    // Insert keeping the list ordered by time so a retrospective add lands
    // where it actually happened, not at the top.
    this.entries.update(xs => [...xs, entry].sort((a, b) => a.logged_at.localeCompare(b.logged_at)));
    this.cancelAdd();
  }
}

function mock(
  id: string,
  hhmm: string,
  raw_text: string,
  kcal: number,
  protein: number,
  carbs: number,
  fat: number,
): FoodLogEntry {
  return {
    id,
    logged_at: `2026-06-22T${hhmm}:00Z`,
    raw_text,
    items: [],
    est_kcal: kcal,
    est_protein_g: protein,
    est_carbs_g: carbs,
    est_fat_g: fat,
    source: 'manual',
  };
}

type MacroEstimate = Pick<FoodLogEntry, 'est_kcal' | 'est_protein_g' | 'est_carbs_g' | 'est_fat_g'>;

// STUB — stands in for the server-side LLM estimator (jimbo-api `logFood`).
// Deterministic so the lab demo is stable: derives plausible-looking macros
// from the text length rather than guessing real nutrition. The real page
// POSTs the text and gets a proper estimate back; this only exists to show the
// "type text → macros appear → edit to override" flow without a backend.
function estimateMacros(text: string): MacroEstimate {
  const seed = text.replace(/\s+/g, '').length;
  const kcal = 120 + seed * 18;
  return {
    est_kcal: kcal,
    est_protein_g: Math.round((kcal * 0.25) / 4),
    est_carbs_g: Math.round((kcal * 0.5) / 4),
    est_fat_g: Math.round((kcal * 0.25) / 9),
  };
}
