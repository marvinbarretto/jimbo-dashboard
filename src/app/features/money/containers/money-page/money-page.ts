import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { UiPage } from '@shared/components/ui-page/ui-page';
import { MoneyService } from '../../data-access/money.service';
import { PLAN_BASIS_LABEL, type LumpyCategory } from '../../data-access/money';

@Component({
  selector: 'app-money-page',
  imports: [CurrencyPipe, DatePipe, DecimalPipe, UiPage],
  templateUrl: './money-page.html',
  styleUrl: './money-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MoneyPage {
  private readonly service = inject(MoneyService);

  readonly summary = this.service.summary;
  readonly isLoading = this.service.isLoading;
  readonly error = this.service.error;

  /** Never render a planned figure without this. See ADR-0036. */
  readonly planBasis = PLAN_BASIS_LABEL;

  /**
   * Lumpy categories still matched by NAME rather than by a YNAB goal. The
   * name list was deleted on 2026-09-11 once all six carried real goals, so
   * this should stay empty; if one ever appears, a goal was removed in the UI
   * and the runway divisor moved with it.
   */
  readonly lumpyByName = computed<LumpyCategory[]>(
    () => this.summary()?.assumptions.lumpy_excluded.filter(l => l.detected_by === 'name') ?? [],
  );

  /** Anything here means a number is quietly wrong — surfaced, not hidden. */
  readonly driftWarnings = computed<string[]>(() => {
    const s = this.summary();
    if (!s) return [];
    const out: string[] = [];
    if (!s.assumptions.company_group_matched) {
      out.push('No Fourfold category group matched — company money is NOT fenced, so the personal figure includes it.');
    }
    for (const g of s.assumptions.spend_groups_missing) {
      out.push(`Spend group "${g}" is missing from the budget — planned spend is understated, so runway looks longer than it is.`);
    }
    for (const l of this.lumpyByName()) {
      out.push(`"${l.name}" is excluded from planned spend by name, not by a goal — set a yearly target on it.`);
    }
    return out;
  });

  /** Costs one of YNAB's 200 hourly requests, so it is user-initiated only. */
  refresh(): void { this.service.refresh(); }

  /** The two numbers worth acting on today, as opposed to the balance. */
  readonly needsAttention = computed(() => {
    const a = this.summary()?.attention;
    return !!a && (a.uncategorised > 0 || a.unapproved > 0);
  });
}
