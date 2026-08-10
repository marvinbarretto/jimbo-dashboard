import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { UiButton } from '@shared/components/ui-button/ui-button';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import { UiTrackerDayGroup } from '@shared/components/ui-tracker-day-group/ui-tracker-day-group';
import {
  type TrackerEntry,
  type TrackerMeasure,
} from '@shared/components/tracker/tracker.types';
import { ToastService } from '@shared/components/toast/toast.service';
import { logicalDay } from '@shared/utils/datetime.utils';
import { injectLogicalToday } from '../../utils/logical-today';
import {
  NutritionService,
  type FoodLogEntry,
  type FrequentFood,
  type SupplementLogEntry,
} from '@features/nutrition/data-access/nutrition.service';
import {
  createLedgerWriters,
  foodToEntry,
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
  imports: [UiButton, UiLoadingState, UiTrackerDayGroup],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './mobile-log.html',
  styleUrl: './mobile-log.scss',
})
export class MobileLog {
  private readonly service = inject(NutritionService);
  private readonly toast = inject(ToastService);

  protected readonly ledgerMeasures = LEDGER_MEASURES;
  protected readonly quickAdd = QUICK_ADD;

  // Logical day (04:00 London cutover, matching logicalDay below), resume-safe
  // — see injectLogicalToday for why a plain constant lies in the WebView.
  protected readonly today = injectLogicalToday();

  private readonly foodRes = httpResource<{ items: FoodLogEntry[] }>(
    () => `/api/coach/food-log?from=${this.today()}&to=${this.today()}&limit=200`,
  );
  private readonly suppRes = httpResource<{ items: SupplementLogEntry[] }>(
    () => `/api/coach/supplement-log?from=${this.today()}&to=${this.today()}&limit=200`,
  );
  private readonly frequentRes = httpResource<{ items: FrequentFood[] }>(
    () => `/api/coach/food-log/frequent?limit=40`,
  );

  // Spinner only on the FIRST load — reload-after-write keeps hasValue() true
  // so the ledger isn't torn down under the user's thumb after every edit.
  // Gated on BOTH resources: food resolving first would otherwise flash
  // "nothing logged" over a supplements-only day still in flight.
  protected readonly loading = computed(
    () =>
      (this.foodRes.isLoading() && !this.foodRes.hasValue()) ||
      (this.suppRes.isLoading() && !this.suppRes.hasValue()),
  );

  // A resource in error state THROWS from value() — hasValue() is the guard,
  // not ?. — so failures surface here instead of killing the render.
  protected readonly loadFailed = computed(
    () => this.foodRes.error() !== undefined || this.suppRes.error() !== undefined,
  );

  protected retry(): void {
    this.foodRes.reload();
    this.suppRes.reload();
    this.frequentRes.reload();
  }

  protected readonly suggestions = computed<string[]>(() =>
    (this.frequentRes.hasValue() ? this.frequentRes.value().items : []).map(f => f.label),
  );

  protected readonly entries = computed<TrackerEntry[]>(() => {
    const today = this.today();
    const out: TrackerEntry[] = [];
    const foods = this.foodRes.hasValue() ? this.foodRes.value().items : [];
    const supps = this.suppRes.hasValue() ? this.suppRes.value().items : [];
    for (const f of foods) {
      if (logicalDay(f.logged_at) === today) out.push(foodToEntry(f));
    }
    for (const s of supps) {
      if (logicalDay(s.taken_at) === today) out.push(suppToEntry(s));
    }
    return out.sort((a, b) => b.at.localeCompare(a.at));
  });

  // Write side is shared with the desktop page — see createLedgerWriters.
  protected readonly ledger = createLedgerWriters({
    service: this.service,
    toast: this.toast,
    onFoodChanged: () => {
      this.foodRes.reload();
      this.frequentRes.reload(); // a new/edited food may change the suggestions
    },
    onSupplementsChanged: () => this.suppRes.reload(),
  });
}
