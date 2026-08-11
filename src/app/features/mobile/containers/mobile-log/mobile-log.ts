import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { UiButton } from '@shared/components/ui-button/ui-button';
import { UiLoadingState } from '@shared/components/ui-loading-state/ui-loading-state';
import { UiTrackerDayGroup } from '@shared/components/ui-tracker-day-group/ui-tracker-day-group';
import {
  type TrackerEntry,
  type TrackerMeasure,
} from '@shared/components/tracker/tracker.types';
import { UiBarChart } from '@shared/components/ui-bar-chart/ui-bar-chart';
import { ToastService } from '@shared/components/toast/toast.service';
import { logicalDay, shiftIsoDay } from '@shared/utils/datetime.utils';
import { injectHaptics } from '../../utils/haptics';
import { injectLogicalToday } from '../../utils/logical-today';
import { weekAxis } from '../../utils/week-axis';
import {
  NutritionService,
  type FoodDailyRow,
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

/** A frequent food surfaced as a one-tap log button. */
export interface Usual {
  /** Quantity-stripped, lowercased label — dedupe key and display text. */
  readonly key: string;
  readonly kcal: number;
  readonly item: FrequentFood;
}

// "1 pale ale" / "3 pale ale" / "1 Guinness" collapse onto one chip each: the
// frequents endpoint ranks raw labels, and leading quantities fragment them.
function usualKey(label: string): string {
  return label.replace(/^\d+\s+/, '').trim().toLowerCase();
}

/**
 * Log tab — today's food, drink and supplements as a single day ledger.
 *
 * Deliberately one day and no pager: the phone's job is correcting what landed
 * via Telegram capture and seeing today back. Browsing history stays on the
 * desktop period pages.
 */
@Component({
  selector: 'app-mobile-log',
  imports: [UiBarChart, UiButton, UiLoadingState, UiTrackerDayGroup],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './mobile-log.html',
  styleUrl: './mobile-log.scss',
})
export class MobileLog {
  private readonly service = inject(NutritionService);
  private readonly toast = inject(ToastService);
  private readonly haptics = injectHaptics();

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
  // Trailing week for the strip below the ledger — the "seeing data back" ask.
  private readonly dailyRes = httpResource<{ days: FoodDailyRow[] }>(
    () => `/api/coach/food-log/daily?from=${shiftIsoDay(this.today(), -6)}&to=${this.today()}`,
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
    this.dailyRes.reload();
  }

  protected readonly week = computed(() =>
    weekAxis(
      this.today(),
      this.dailyRes.hasValue() ? this.dailyRes.value().days : [],
      (d) => d.date,
      (d) => d.kcal,
    ),
  );
  // Gate on data-loaded, not non-zero: an all-zero week is an honest chart,
  // and a some()>0 gate would hide the strip until an app restart after the
  // first-ever entry.
  protected readonly hasWeek = computed(() => this.dailyRes.hasValue());

  protected readonly suggestions = computed<string[]>(() =>
    (this.frequentRes.hasValue() ? this.frequentRes.value().items : []).map(f => f.label),
  );

  // ── Usuals: the frequent cluster as one-tap buttons ─────────────
  // Tap = instant POST with the entry's last-known macros — no typing, no LLM
  // round-trip. The second pint is a second tap on the same chip.
  protected readonly usuals = computed<Usual[]>(() => {
    const items = this.frequentRes.hasValue() ? this.frequentRes.value().items : [];
    const seen = new Set<string>();
    const out: Usual[] = [];
    for (const f of items) {
      if (f.est_kcal === null) continue;
      const key = usualKey(f.label);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push({ key, kcal: Math.round(f.est_kcal), item: f });
      if (out.length === 6) break;
    }
    return out;
  });

  /** Times each usual has been logged today — the ×n tally on its chip. */
  protected readonly usualTally = computed<ReadonlyMap<string, number>>(() => {
    const m = new Map<string, number>();
    for (const e of this.entries()) {
      const key = usualKey(e.label);
      m.set(key, (m.get(key) ?? 0) + 1);
    }
    return m;
  });

  // Per-chip in-flight guard: a mid-flight re-tap is dropped (double-tap
  // jitter), but once the POST lands the same chip logs another — by design.
  private readonly usualPending = signal<ReadonlySet<string>>(new Set());

  protected usualIsPending(key: string): boolean {
    return this.usualPending().has(key);
  }

  protected logUsual(u: Usual): void {
    if (this.usualIsPending(u.key)) return;
    this.usualPending.update((s) => new Set(s).add(u.key));
    this.haptics.tap();
    this.service.createFood({
      raw_text: u.item.label,
      est_kcal: u.item.est_kcal,
      est_protein_g: u.item.est_protein_g,
      est_carbs_g: u.item.est_carbs_g,
      est_fat_g: u.item.est_fat_g,
    }).subscribe({
      next: () => {
        this.clearUsualPending(u.key);
        this.toast.success(`${u.key} · ${u.kcal} kcal logged`);
        this.foodRes.reload();
        this.dailyRes.reload();
      },
      error: () => {
        this.clearUsualPending(u.key);
        this.toast.error(`Could not log ${u.key}`);
      },
    });
  }

  private clearUsualPending(key: string): void {
    this.usualPending.update((s) => {
      const next = new Set(s);
      next.delete(key);
      return next;
    });
  }

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
      this.dailyRes.reload(); // today's bar in the week strip
    },
    onSupplementsChanged: () => this.suppRes.reload(),
  });
}
