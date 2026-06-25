import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiSubhead } from '@shared/components/ui-subhead/ui-subhead';
import { UiPeriodTotals } from '@shared/components/ui-period-totals/ui-period-totals';
import { UiTrackerDayGroup } from '@shared/components/ui-tracker-day-group/ui-tracker-day-group';
import {
  sumMeasures,
  type TrackerDailyTotal,
  type TrackerDraft,
  type TrackerEntry,
  type TrackerMeasure,
  type TrackerPatch,
} from '@shared/components/tracker/tracker.types';
import { londonDay, londonToday, shiftIsoDay } from '@shared/utils/datetime.utils';

// One schema = nutrition (food macros + a generic dose for supplements). The
// second tracker below reuses the SAME primitives with a different measure set
// (project work) to prove the abstraction holds beyond nutrition.
const NUTRITION_MEASURES: readonly TrackerMeasure[] = [
  { key: 'kcal', label: 'calories', unit: 'kcal', primary: true },
  { key: 'protein_g', label: 'protein', unit: 'p' },
  { key: 'carbs_g', label: 'carbs', unit: 'c' },
  { key: 'fat_g', label: 'fat', unit: 'f' },
  { key: 'dose', label: 'dose' },
];
const NUTRITION_TOTALS: readonly TrackerMeasure[] = NUTRITION_MEASURES.slice(0, 4);
const NUTRITION_QUICK: readonly TrackerMeasure[] = [{ key: 'kcal', label: 'kcal', unit: 'kcal' }];
const NUTRITION_TARGETS = { kcal: 2200, protein_g: 150 };

const WORK_MEASURES: readonly TrackerMeasure[] = [
  { key: 'minutes', label: 'minutes', unit: 'm', primary: true },
  { key: 'commits', label: 'commits', unit: '' },
];
const WORK_QUICK: readonly TrackerMeasure[] = [
  { key: 'minutes', label: 'min', unit: 'm' },
  { key: 'commits', label: 'commits' },
];
const WORK_TARGETS = { minutes: 240 };

/**
 * The generic Tracker family — day-grouped, editable, totalled entry logging —
 * composed two ways from one set of primitives:
 *
 *   UiPeriodTotals · UiTrackerDayGroup ( UiTrackerRow + UiQuickAddRow )
 *
 * Left: nutrition (food + supplements interleaved, heterogeneous units). Right:
 * project work (minutes + commits). Same components, different `TrackerMeasure[]`.
 * All state is client-side here — edit a value, add a row, delete one, and the
 * totals/meters recompute live.
 */
@Component({
  selector: 'app-tracker-section',
  imports: [UiSection, UiStack, UiSubhead, UiPeriodTotals, UiTrackerDayGroup],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['../lab-utils.scss'],
  template: `
    <app-ui-section title="Tracker (generic)" [collapsible]="false">
      <app-ui-stack gap="lg">
        <p class="ui-lab__support-copy">
          A measure-agnostic family for "a list of timestamped entries, each a label
          + a value per measure, grouped by day, summed per measure." The nutrition
          page is the first consumer; the same primitives drive any tracker by
          swapping the <code>TrackerMeasure[]</code>. Edit a value inline (incl. the
          time, for retrospective fixes), add via the quick-add row, or delete —
          totals + meters recompute live.
        </p>

        <div class="tracker-demo__cols">
          <!-- Nutrition: food + supplements interleaved -->
          <section class="tracker-demo__col">
            <app-ui-subhead label="Nutrition" />
            <app-ui-period-totals
              [measures]="nutritionTotals"
              [daily]="nutritionDaily()"
              [targets]="nutritionTargets"
            />
            @for (d of nutritionDays(); track d.date) {
              <app-ui-tracker-day-group
                [date]="d.date"
                [entries]="d.entries"
                [measures]="nutritionMeasures"
                [editable]="true"
                [expanded]="d.date === today"
                [quickAddMeasures]="nutritionQuick"
                quickAddPlaceholder="what did you eat or drink?"
                quickAddKind="food"
                (add)="addNutrition($event)"
                (patch)="patchNutrition($event)"
                (remove)="removeNutrition($event)"
              />
            }
          </section>

          <!-- Project work: same primitives, different schema -->
          <section class="tracker-demo__col">
            <app-ui-subhead label="Project work (same primitives)" />
            <app-ui-period-totals
              [measures]="workMeasures"
              [daily]="workDaily()"
              [targets]="workTargets"
            />
            @for (d of workDays(); track d.date) {
              <app-ui-tracker-day-group
                [date]="d.date"
                [entries]="d.entries"
                [measures]="workMeasures"
                [editable]="true"
                [expanded]="d.date === today"
                [quickAddMeasures]="workQuick"
                quickAddPlaceholder="what did you work on?"
                quickAddKind="work"
                (add)="addWork($event)"
                (patch)="patchWork($event)"
                (remove)="removeWork($event)"
              />
            }
          </section>
        </div>
      </app-ui-stack>
    </app-ui-section>
  `,
  styles: [`
    .tracker-demo__cols {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(22rem, 100%), 1fr));
      gap: 1.5rem;
      align-items: start;
    }

    .tracker-demo__col {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      min-width: 0;
    }
  `],
})
export class TrackerSection {
  protected readonly today = londonToday();
  private readonly yesterday = shiftIsoDay(this.today, -1);

  protected readonly nutritionMeasures = NUTRITION_MEASURES;
  protected readonly nutritionTotals = NUTRITION_TOTALS;
  protected readonly nutritionQuick = NUTRITION_QUICK;
  protected readonly nutritionTargets = NUTRITION_TARGETS;
  protected readonly workMeasures = WORK_MEASURES;
  protected readonly workQuick = WORK_QUICK;
  protected readonly workTargets = WORK_TARGETS;

  private readonly nutrition = signal<TrackerEntry[]>([
    food('n1', this.today, '08:15', 'porridge, banana, honey', 320, 9, 58, 6),
    supp('n2', this.today, '08:20', 'Creatine', 5, 'g'),
    food('n3', this.today, '13:05', 'chicken caesar wrap, crisps', 610, 34, 52, 28),
    food('n4', this.yesterday, '19:30', 'salmon, rice, broccoli', 540, 40, 45, 18),
    supp('n5', this.yesterday, '08:10', 'Vitamin D', 1, 'tablet'),
  ]);

  private readonly work = signal<TrackerEntry[]>([
    work('w1', this.today, '09:40', 'tracker primitives', 95, 3),
    work('w2', this.today, '14:10', 'nutrition page wiring', 70, 2),
    work('w3', this.yesterday, '11:00', 'API CRUD endpoints', 130, 4),
  ]);

  protected readonly nutritionDays = computed(() => groupByDay(this.nutrition()));
  protected readonly workDays = computed(() => groupByDay(this.work()));
  protected readonly nutritionDaily = computed(() => dailyTotals(this.nutrition(), NUTRITION_TOTALS));
  protected readonly workDaily = computed(() => dailyTotals(this.work(), WORK_MEASURES));

  protected addNutrition(d: TrackerDraft): void {
    this.nutrition.update((xs) => [...xs, draftToEntry(d, 'food')]);
  }
  protected patchNutrition(p: TrackerPatch): void {
    this.nutrition.update((xs) => applyPatch(xs, p));
  }
  protected removeNutrition(id: string): void {
    this.nutrition.update((xs) => xs.filter((e) => e.id !== id));
  }

  protected addWork(d: TrackerDraft): void {
    this.work.update((xs) => [...xs, draftToEntry(d, 'work')]);
  }
  protected patchWork(p: TrackerPatch): void {
    this.work.update((xs) => applyPatch(xs, p));
  }
  protected removeWork(id: string): void {
    this.work.update((xs) => xs.filter((e) => e.id !== id));
  }
}

// ── Local helpers (demo only) ────────────────────────────────────

function groupByDay(entries: readonly TrackerEntry[]): { date: string; entries: TrackerEntry[] }[] {
  const groups = new Map<string, TrackerEntry[]>();
  for (const e of entries) {
    const day = londonDay(e.at);
    (groups.get(day) ?? groups.set(day, []).get(day)!).push(e);
  }
  for (const arr of groups.values()) arr.sort((a, b) => b.at.localeCompare(a.at));
  return [...groups.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, es]) => ({ date, entries: es }));
}

function dailyTotals(
  entries: readonly TrackerEntry[],
  measures: readonly TrackerMeasure[],
): TrackerDailyTotal[] {
  const byDay = groupByDay(entries);
  return byDay.map((d) => ({
    date: d.date,
    count: d.entries.length,
    values: sumMeasures(d.entries, measures),
  }));
}

function applyPatch(xs: TrackerEntry[], p: TrackerPatch): TrackerEntry[] {
  return xs.map((e) => {
    if (e.id !== p.id) return e;
    const next = { ...e };
    if (p.changes.label !== undefined) next.label = p.changes.label;
    if (p.changes.at !== undefined) next.at = p.changes.at;
    if (p.changes.values) next.values = { ...e.values, ...p.changes.values };
    return next;
  });
}

function draftToEntry(d: TrackerDraft, kind: string): TrackerEntry {
  return {
    id: `${kind}-${d.label}-${d.at ?? 'now'}`,
    at: d.at ?? new Date().toISOString(),
    label: d.label,
    kind,
    values: { ...d.values },
  };
}

function food(
  id: string, date: string, hhmm: string, label: string,
  kcal: number, p: number, c: number, f: number,
): TrackerEntry {
  return {
    id: `food:${id}`,
    at: `${date}T${hhmm}:00`,
    label,
    kind: 'food',
    values: { kcal, protein_g: p, carbs_g: c, fat_g: f },
  };
}

function supp(id: string, date: string, hhmm: string, name: string, dose: number, unit: string): TrackerEntry {
  return {
    id: `supp:${id}`,
    at: `${date}T${hhmm}:00`,
    label: name,
    kind: 'supplement',
    labelEditable: false,
    values: { dose },
    units: { dose: unit },
  };
}

function work(id: string, date: string, hhmm: string, label: string, minutes: number, commits: number): TrackerEntry {
  return {
    id: `work:${id}`,
    at: `${date}T${hhmm}:00`,
    label,
    kind: 'work',
    values: { minutes, commits },
  };
}
