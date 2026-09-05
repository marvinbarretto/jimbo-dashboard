// Runtime contract for GET /api/costs/summary?days=N. Mirrors jimbo-api's
// CostSummarySchema. Only the fields the fleet page reads are declared strictly;
// the per-model and per-task breakdowns are left off because the fleet board
// does not render them and declaring them would make the page fail on drift in
// a field it never shows.
import { z } from 'zod';

export const ApiCostDaySchema = z.object({
  day:      z.string(),
  // null when every row that day was unpriced — not the same as a free day.
  total:    z.number().nullable(),
  count:    z.number().int(),
  unpriced: z.number().int(),
});

export const ApiCostSummarySchema = z.object({
  period_days:        z.number(),
  total_cost:         z.number(),
  total_interactions: z.number(),
  // Rows with no rate on file, excluded from total_cost. Any total sitting
  // beside a non-zero unpriced is a floor, not a full figure — and saying so
  // is the difference between a number and a misleading one.
  unpriced:           z.number().int(),
  by_day:             z.array(ApiCostDaySchema),
  monthly_cost:       z.number(),
}).loose();

export type ApiCostSummary = z.infer<typeof ApiCostSummarySchema>;
export type CostDay = z.infer<typeof ApiCostDaySchema>;
