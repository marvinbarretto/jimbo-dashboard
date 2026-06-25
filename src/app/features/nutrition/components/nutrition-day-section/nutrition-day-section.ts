import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiStatCard } from '@shared/components/ui-stat-card/ui-stat-card';
import { UiSubhead } from '@shared/components/ui-subhead/ui-subhead';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import { catchError, of, switchMap, timer } from 'rxjs';
import { formatLondonTime } from '@shared/utils/datetime.utils';
import { NUTRITION_READ } from '../../data-access/nutrition.read';
import type { FoodLogEntry, SupplementLogEntry } from '../../data-access/nutrition.service';

@Component({
  selector: 'app-nutrition-day-section',
  imports: [UiSection, UiStack, UiStatCard, UiSubhead, UiEmptyState, UiLoadingState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './nutrition-day-section.html',
  styleUrl: './nutrition-day-section.scss',
})
export class NutritionDaySection {
  private readonly service = inject(NUTRITION_READ);

  // London calendar day (YYYY-MM-DD). Food is bucketed by London day
  // server-side; the journal day key is treated the same way here.
  readonly date = input.required<string>();

  private readonly result = toSignal(
    timer(0, 60_000).pipe(
      switchMap(() =>
        this.service.list({ date: this.date(), limit: 100 }).pipe(
          catchError(() => of({ items: [] as FoodLogEntry[] })),
        ),
      ),
    ),
    { initialValue: null },
  );

  private readonly suppResult = toSignal(
    timer(0, 60_000).pipe(
      switchMap(() =>
        this.service.supplementLog({ date: this.date(), limit: 100 }).pipe(
          catchError(() => of({ items: [] as SupplementLogEntry[] })),
        ),
      ),
    ),
    { initialValue: null },
  );

  // Loading until BOTH feeds have answered; both fire at t=0 so this is brief.
  readonly loading = computed(() => this.result() === null || this.suppResult() === null);
  readonly entries = computed<FoodLogEntry[]>(() => this.result()?.items ?? []);
  readonly supplements = computed<SupplementLogEntry[]>(() => this.suppResult()?.items ?? []);

  // Collapse once we know nothing (food or supplements) was logged; stay open
  // while loading.
  readonly open = linkedSignal(() =>
    this.loading() || this.entries().length > 0 || this.supplements().length > 0,
  );

  readonly totals = computed(() =>
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

  readonly sectionMeta = computed(() => {
    const parts: string[] = [];
    const n = this.entries().length;
    if (n > 0) parts.push(`${n} ${n === 1 ? 'entry' : 'entries'} · ${this.totals().kcal} kcal`);
    const s = this.supplements().length;
    if (s > 0) parts.push(`${s} supplement${s === 1 ? '' : 's'}`);
    return parts.length ? parts.join(' · ') : 'no entries';
  });

  // London HH:MM for an entry timestamp.
  formatTime(ts: string): string {
    return formatLondonTime(ts);
  }

  // "5 g" / "1 tablet" — drop a redundant unit-less dose to just the number.
  formatDose(dosage: number, unit: string): string {
    return unit ? `${dosage} ${unit}` : `${dosage}`;
  }
}
