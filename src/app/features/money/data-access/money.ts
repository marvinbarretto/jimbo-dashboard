// Types come from the generated contract, never hand-written — jimbo-api's
// openapi.json is the source of truth (`npm run gen:api-types`).
import type { components } from '../../../domain/api-types.generated';

export type MoneySummary = components['schemas']['MoneySummary'];
export type LumpyCategory = components['schemas']['LumpyCategory'];
export type MoneyCategory = components['schemas']['MoneyCategory'];
export type MoneyCategoryList = components['schemas']['MoneyCategoryList'];

/**
 * Everything under `plan` is derived from the YNAB budget — intent, not
 * history. See ADR-0036. The UI must never show a figure from here without
 * saying "at planned spend"; an unqualified number is a defect, because the
 * measured counterpart (`actual`) legitimately disagrees.
 */
export const PLAN_BASIS_LABEL = 'at planned spend';

export type MoneyActual = components['schemas']['MoneyActual'];
export type MoneyAggregates = components['schemas']['MoneyAggregates'];
export type MoneyAggregatePayload = MoneyAggregates['payload'];

/**
 * The measured counterpart. `plan` is what he intends to spend; this is what
 * the bank says he spent. They legitimately disagree, and the gap is the
 * finding — so every measured figure is labelled too, never left to be read as
 * the same kind of number as the planned one.
 */
export const ACTUAL_BASIS_LABEL = 'at measured burn';

/** A month-keyed series as the pipeline publishes it. */
export type MonthlySeries = Record<string, number>;

/**
 * Mean of a month-keyed series across `months`.
 *
 * Averaged over the months actually present rather than over `months.length`: a category
 * that only exists for two of the last six months would otherwise read as a
 * third of its real monthly cost.
 */
export function monthlyAverage(series: MonthlySeries, months: string[]): number | null {
  const present = months.filter(m => typeof series[m] === 'number');
  if (!present.length) return null;
  return present.reduce((n, m) => n + series[m], 0) / present.length;
}
