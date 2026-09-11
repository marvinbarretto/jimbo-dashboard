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
 * measured counterpart (`actual`, still unpublished) legitimately disagrees.
 */
export const PLAN_BASIS_LABEL = 'at planned spend';
