import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiBarChart } from '@shared/components/ui-bar-chart/ui-bar-chart';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import { catchError, combineLatest, of, startWith, switchMap, timer } from 'rxjs';
import type {
  ExerciseCatalogItem,
  SessionDetailed,
} from '../../../exercise/data-access/exercise.service';
import { EXERCISE_READ } from '../../../exercise/data-access/exercise.read';
import type { FoodDailyRow } from '../../../nutrition/data-access/nutrition.service';
import { NUTRITION_READ } from '../../../nutrition/data-access/nutrition.read';
import {
  REGION_LABELS,
  REGION_ORDER,
  trainingDayTypeByDate,
  type ExerciseMeta,
  type TrainingDayType,
} from '../../../exercise/utils/muscle-region';

// Bucket display order: rest first (the baseline), then body regions in their
// usual order, 'other' for unclassified exercises, 'mixed' last (ambiguous
// days) — buckets absent from the data are filtered out by the caller.
const BUCKET_ORDER: readonly ('rest' | TrainingDayType)[] = ['rest', ...REGION_ORDER, 'other', 'mixed'];
const BUCKET_LABELS: Readonly<Record<'rest' | TrainingDayType, string>> = {
  rest: 'Rest',
  mixed: 'Mixed',
  ...REGION_LABELS,
};

interface FuelBucket {
  type: 'rest' | TrainingDayType;
  label: string;
  avgKcal: number;
  avgProtein: number;
  days: number;
}

// "Did I eat enough on leg day?" — buckets each day in the range by which
// muscle region dominated that day's training (or 'rest'/'mixed'), then
// averages that day's logged kcal/protein per bucket. Range-based like its
// sibling ExerciseSummarySection, since it's mounted on the same journal
// week/month pages.
@Component({
  selector: 'app-training-fuel-section',
  imports: [UiSection, UiStack, UiBarChart, UiEmptyState, UiLoadingState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './training-fuel-section.html',
  styleUrl: './training-fuel-section.scss',
})
export class TrainingFuelSection {
  private readonly exercise = inject(EXERCISE_READ);
  private readonly nutrition = inject(NUTRITION_READ);

  readonly from = input.required<string>(); // YYYY-MM-DD inclusive
  readonly to = input.required<string>();    // YYYY-MM-DD inclusive

  // The exercise catalogue is effectively static — fetch once, not per poll.
  private readonly catalog = toSignal(
    this.exercise.listExercises().pipe(catchError(() => of([] as ExerciseCatalogItem[]))),
    { initialValue: [] as ExerciseCatalogItem[] },
  );

  // Rekeyed on the range inputs so week/month navigation refetches immediately
  // and cancels the in-flight request; startWith(null) restores the loading
  // state while the new range loads.
  private readonly result = toSignal(
    combineLatest([toObservable(this.from), toObservable(this.to)]).pipe(
      switchMap(([from, to]) => timer(0, 60_000).pipe(
        switchMap(() =>
          combineLatest({
            sessions: this.exercise.listDetailed({ from, to, limit: 200 }).pipe(
              catchError(() => of({ items: [] as SessionDetailed[] })),
            ),
            nutritionDaily: this.nutrition.daily({ from, to }).pipe(
              catchError(() => of({ days: [] as FoodDailyRow[] })),
            ),
          }),
        ),
        startWith(null),
      )),
    ),
    { initialValue: null },
  );

  readonly loading = computed(() => this.result() === null);

  private readonly exerciseIndex = computed<ReadonlyMap<string, ExerciseMeta>>(
    () => new Map(this.catalog().map((e) => [e.id, e])),
  );

  private readonly dayType = computed(() =>
    trainingDayTypeByDate(this.result()?.sessions.items ?? [], this.exerciseIndex()),
  );

  readonly buckets = computed<FuelBucket[]>(() => {
    const dayType = this.dayType();
    const sums = new Map<'rest' | TrainingDayType, { kcal: number; protein: number; days: number }>();
    for (const row of this.result()?.nutritionDaily.days ?? []) {
      const type = dayType.get(row.date) ?? 'rest';
      const s = sums.get(type) ?? { kcal: 0, protein: 0, days: 0 };
      s.kcal += row.kcal;
      s.protein += row.protein_g;
      s.days += 1;
      sums.set(type, s);
    }
    return BUCKET_ORDER.filter((type) => sums.has(type)).map((type) => {
      const s = sums.get(type)!;
      return {
        type,
        label: BUCKET_LABELS[type],
        avgKcal: Math.round(s.kcal / s.days),
        avgProtein: Math.round(s.protein / s.days),
        days: s.days,
      };
    });
  });

  readonly hasData = computed(() => this.buckets().length > 0);
  readonly bucketLabels = computed(() => this.buckets().map((b) => `${b.label} (${b.days}d)`));
  readonly avgKcalByBucket = computed(() => this.buckets().map((b) => b.avgKcal));
  readonly avgProteinByBucket = computed(() => this.buckets().map((b) => b.avgProtein));
}
