import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { UiSection } from '@shared/components/ui-section/ui-section';
import { UiStack } from '@shared/components/ui-stack/ui-stack';
import { UiStatCard } from '@shared/components/ui-stat-card/ui-stat-card';
import { UiSubhead } from '@shared/components/ui-subhead/ui-subhead';
import { UiEmptyState } from '@shared/components/ui-empty-state/ui-empty-state';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import { catchError, of, switchMap, timer } from 'rxjs';
import { NutritionService, type FoodLogEntry } from '../../data-access/nutrition.service';

@Component({
  selector: 'app-nutrition-day-section',
  imports: [UiSection, UiStack, UiStatCard, UiSubhead, UiEmptyState, UiLoadingState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './nutrition-day-section.html',
  styleUrl: './nutrition-day-section.scss',
})
export class NutritionDaySection {
  private readonly service = inject(NutritionService);

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

  readonly loading = computed(() => this.result() === null);
  readonly entries = computed<FoodLogEntry[]>(() => this.result()?.items ?? []);

  // Collapse once we know nothing was logged; stay open while loading.
  readonly open = linkedSignal(() => this.loading() || this.entries().length > 0);

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
    const n = this.entries().length;
    if (n === 0) return 'no entries';
    return `${n} ${n === 1 ? 'entry' : 'entries'} · ${this.totals().kcal} kcal`;
  });

  // London HH:MM for an entry timestamp.
  formatTime(ts: string): string {
    return new Date(ts).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/London',
    });
  }
}
