import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import { UiTrackerDayGroup } from '@shared/components/ui-tracker-day-group/ui-tracker-day-group';
import {
  type TrackerDraft,
  type TrackerEntry,
  type TrackerMeasure,
  type TrackerPatch,
} from '@shared/components/tracker/tracker.types';
import { ToastService } from '@shared/components/toast/toast.service';
import { logicalDay } from '@shared/utils/datetime.utils';
import { todayKey } from '@shared/utils/date-keys';
import {
  NutritionService,
  type FoodLogEntry,
  type FrequentFood,
  type SupplementLogEntry,
} from '@features/nutrition/data-access/nutrition.service';
import {
  foodChanges,
  foodToEntry,
  splitId,
  suppChanges,
  suppToEntry,
} from '@features/nutrition/data-access/nutrition-ledger';

// Fewer measures than the desktop ledger: on a phone the row has to stay
// readable at a glance, and calories are what get corrected. The rest are
// reachable in the edit sheet.
const LEDGER_MEASURES: readonly TrackerMeasure[] = [
  { key: 'kcal', label: 'calories', unit: 'kcal', primary: true },
  { key: 'protein_g', label: 'protein', unit: 'p' },
  { key: 'dose', label: 'dose' },
];

const QUICK_ADD: readonly TrackerMeasure[] = [{ key: 'kcal', label: 'kcal', unit: 'kcal' }];

/**
 * Log tab — today's food, drink and supplements as a single day ledger.
 *
 * Deliberately one day and no pager: the phone's job is correcting what landed
 * via Telegram capture and seeing today back. Browsing history stays on the
 * desktop period pages.
 */
@Component({
  selector: 'app-mobile-log',
  imports: [UiLoadingState, UiTrackerDayGroup],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './mobile-log.html',
  styleUrl: './mobile-log.scss',
})
export class MobileLog {
  private readonly service = inject(NutritionService);
  private readonly toast = inject(ToastService);

  protected readonly ledgerMeasures = LEDGER_MEASURES;
  protected readonly quickAdd = QUICK_ADD;
  protected readonly today = todayKey();

  private readonly foodRes = httpResource<{ items: FoodLogEntry[] }>(
    () => `/api/coach/food-log?from=${this.today}&to=${this.today}&limit=200`,
  );
  private readonly suppRes = httpResource<{ items: SupplementLogEntry[] }>(
    () => `/api/coach/supplement-log?from=${this.today}&to=${this.today}&limit=200`,
  );
  private readonly frequentRes = httpResource<{ items: FrequentFood[] }>(
    () => `/api/coach/food-log/frequent?limit=40`,
  );

  // Spinner only on the FIRST load — reload-after-write keeps hasValue() true so
  // the ledger isn't torn down under the user's thumb after every edit.
  protected readonly loading = computed(() => this.foodRes.isLoading() && !this.foodRes.hasValue());

  protected readonly suggestions = computed<string[]>(() =>
    (this.frequentRes.value()?.items ?? []).map(f => f.label),
  );

  protected readonly entries = computed<TrackerEntry[]>(() => {
    const out: TrackerEntry[] = [];
    for (const f of this.foodRes.value()?.items ?? []) {
      if (logicalDay(f.logged_at) === this.today) out.push(foodToEntry(f));
    }
    for (const s of this.suppRes.value()?.items ?? []) {
      if (logicalDay(s.taken_at) === this.today) out.push(suppToEntry(s));
    }
    return out.sort((a, b) => b.at.localeCompare(a.at));
  });

  protected onAdd(draft: TrackerDraft): void {
    const kcal = draft.values['kcal'];
    const estimating = kcal == null;
    // The LLM estimate adds ~1–2s before the entry appears — acknowledge the add.
    if (estimating) this.toast.info(`Estimating “${draft.label}”…`);
    this.service
      .createFood({
        raw_text: draft.label,
        logged_at: draft.at,
        est_kcal: kcal ?? null,
        estimate: estimating,
      })
      .subscribe({
        next: () => this.reloadFood(),
        error: () => this.toast.error('Could not add entry'),
      });
  }

  protected onPatch(p: TrackerPatch): void {
    const { kind, id } = splitId(p.id);
    if (kind === 'food') {
      this.service.patchFood(id, foodChanges(p.changes)).subscribe({
        next: () => this.reloadFood(),
        error: () => this.toast.error('Could not save edit'),
      });
    } else {
      this.service.patchSupplement(Number(id), suppChanges(p.changes)).subscribe({
        next: () => this.suppRes.reload(),
        error: () => this.toast.error('Could not save edit'),
      });
    }
  }

  protected onRemove(entryId: string): void {
    const { kind, id } = splitId(entryId);
    if (kind === 'food') {
      this.service.deleteFood(id).subscribe({
        next: () => this.reloadFood(),
        error: () => this.toast.error('Could not delete entry'),
      });
    } else {
      this.service.deleteSupplement(Number(id)).subscribe({
        next: () => this.suppRes.reload(),
        error: () => this.toast.error('Could not delete entry'),
      });
    }
  }

  private reloadFood(): void {
    this.foodRes.reload();
    this.frequentRes.reload(); // a new/edited food may change the suggestions
  }
}
