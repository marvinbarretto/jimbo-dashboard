import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { UiPage } from '@shared/components/ui-page/ui-page';
import { MoneyService } from '../../data-access/money.service';
import {
  ACTUAL_BASIS_LABEL,
  PLAN_BASIS_LABEL,
  monthlyAverage,
  type LumpyCategory,
} from '../../data-access/money';

/**
 * How many recent months the per-category and per-payee tables average over.
 *
 * Six, not the whole 101-month history: the question these tables answer is
 * "what am I spending NOW", and an average dragged back to 2018 answers a
 * different one. The basis is printed on the page rather than left implicit.
 */
const RECENT_MONTHS = 6;

/** Days as a phrase someone reads rather than a number they have to weigh. */
function relativeDays(days: number): string {
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 60) return `${days} days ago`;
  const months = Math.round(days / 30);
  return `${months} months ago`;
}

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
  readonly aggregates = this.service.aggregates;
  readonly aggregatesMissing = this.service.aggregatesMissing;
  readonly isLoading = this.service.isLoading;
  readonly error = this.service.error;

  /** Never render either figure without its basis. See ADR-0036. */
  readonly planBasis = PLAN_BASIS_LABEL;
  readonly actualBasis = ACTUAL_BASIS_LABEL;
  readonly recentMonths = RECENT_MONTHS;

  /** The measured block on /summary — null until the pipeline has published. */
  readonly actual = computed(() => this.summary()?.actual ?? null);

  /**
   * When the measured numbers were last sourced, in days rather than as a date.
   *
   * The date alone was already on the page and did not do the job: reading
   * "2026-09-11" and working out whether that is recent is arithmetic, and
   * arithmetic you have to volunteer is arithmetic you skip. "sourced 34 days
   * ago" is read, not computed.
   *
   * Deliberately NOT a threshold or a warning colour — this tells you the age
   * and trusts you to judge it. A nag would be a different feature, and one
   * that is not worth building until a publish has actually been missed.
   */
  readonly measuredAge = computed(() => {
    const generated = this.actual()?.generated;
    if (!generated) return null;
    const then = new Date(`${generated}T00:00:00Z`);
    if (Number.isNaN(then.getTime())) return null;

    // Whole days between calendar dates, both pinned to UTC midnight, so the
    // answer does not flip because the page was opened late in the evening.
    const now = new Date();
    const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const days = Math.round((today - then.getTime()) / 86_400_000);

    return { generated, days, phrase: relativeDays(days) };
  });

  /**
   * The gap between intent and measurement, which is the whole point of
   * carrying both. Presented as a monthly overspend rather than as two runway
   * figures, because "£977/mo more than I planned" is actionable and "25 vs 34
   * months" invites picking the flattering one.
   */
  readonly planVsActual = computed(() => {
    const s = this.summary();
    const a = this.actual();
    if (!s || a?.monthly_burn == null) return null;
    const gap = a.monthly_burn - s.plan.monthly_spend;
    return {
      planned: s.plan.monthly_spend,
      measured: a.monthly_burn,
      gap,
      // Which way round matters: under-planning inflates the runway, which is
      // the dangerous direction. Over-planning is merely pessimistic.
      overspending: gap > 0,
    };
  });

  /** The last N months present in the published series, oldest first. */
  readonly recentWindow = computed<string[]>(() => {
    const p = this.aggregates()?.payload;
    if (!p) return [];
    // full_months excludes a partial current month, which would otherwise drag
    // every average down for no reason other than the date.
    return p.full_months.slice(-RECENT_MONTHS);
  });

  /** Category spend per month, biggest first. The "where does it go" table. */
  readonly categorySpend = computed(() => this.averaged(this.aggregates()?.payload.categories));

  /** Watched payees per month. Narrower and more pointed than categories. */
  readonly watchlistSpend = computed(() => this.averaged(this.aggregates()?.payload.watchlist));

  private averaged(series: Record<string, Record<string, number>> | undefined) {
    const months = this.recentWindow();
    if (!series || !months.length) return [];
    return Object.entries(series)
      .map(([label, byMonth]) => ({
        label,
        perMonth: monthlyAverage(byMonth, months),
        latest: byMonth[months[months.length - 1]] ?? null,
      }))
      .filter(row => row.perMonth !== null && row.perMonth !== 0)
      .sort((a, b) => (b.perMonth ?? 0) - (a.perMonth ?? 0));
  }

  /**
   * Billable days per month needed to cover measured burn, at each day rate.
   * The one number on this page that is about earning rather than spending.
   */
  readonly breakEven = computed(() => {
    const p = this.aggregates()?.payload;
    if (!p) return [];
    return Object.entries(p.break_even_days_per_month)
      .map(([rate, days]) => ({ rate: Number(rate), days }))
      .sort((a, b) => a.rate - b.rate);
  });

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

  /**
   * Caveats that change how every measured figure should be read. Rendered
   * alongside the numbers, not in a footnote: a floor presented as a total is
   * the same class of error as intent presented as measurement.
   */
  readonly measuredCaveats = computed<string[]>(() => {
    const a = this.actual();
    const p = this.aggregates()?.payload;
    const out: string[] = [];
    if (!a) return out;
    if (a.incomplete) {
      out.push('An account has no known balance, so every measured figure here is a FLOOR, not a total.');
    }
    for (const [code, amount] of Object.entries(a.excluded_currencies)) {
      out.push(`${code} ${amount.toLocaleString()} is held but NOT counted in the measured runway — no agreed conversion rate.`);
    }
    if (p?.coverage.monzo_only_before) {
      out.push(`Totals before ${p.coverage.cross_account_from} are one account only. ${p.coverage.basis_note}`);
    }
    return out;
  });

  /** The two numbers worth acting on today, as opposed to the balance. */
  readonly needsAttention = computed(() => {
    const a = this.summary()?.attention;
    return !!a && (a.uncategorised > 0 || a.unapproved > 0);
  });
}
