// Runtime contract for GET /api/fleet-report/daily. Mirrors jimbo-api's
// DailyFleetReportSchema (src/schemas/fleet-report.ts). Zod at the wire
// boundary, same rationale as fleet-stats.api-schema.ts.
import { z } from 'zod';

export const ApiFleetReportModelUsageSchema = z.object({
  model: z.string().nullable(),
  count: z.number().int(),
});

export const ApiFleetReportSkillBreakdownSchema = z.object({
  skill:          z.string().nullable(),
  flow:           z.string(),
  count:          z.number().int(),
  first_at:       z.string().nullable(),
  last_at:        z.string().nullable(),
  sustained_loop: z.boolean(),
});

export const ApiFleetReportFailureSchema = z.object({
  id:             z.string(),
  skill:          z.string().nullable(),
  error_message:  z.string().nullable(),
  completed_at:   z.string().nullable(),
});

export const ApiFleetReportActorSchema = z.object({
  executor:       z.string(),
  total_jobs:     z.number().int(),
  completed:      z.number().int(),
  failed:         z.number().int(),
  estimated_cost: z.number(),
  input_tokens:   z.number().int(),
  output_tokens:  z.number().int(),
  models_used:    z.array(ApiFleetReportModelUsageSchema),
  by_skill:       z.array(ApiFleetReportSkillBreakdownSchema),
  failures:       z.array(ApiFleetReportFailureSchema),
});

export const ApiDailyFleetReportSchema = z.object({
  report_date:  z.string(),
  generated_at: z.string(),
  actors:       z.array(ApiFleetReportActorSchema),
});

export type ApiDailyFleetReport = z.infer<typeof ApiDailyFleetReportSchema>;
export type FleetReportModelUsage = z.infer<typeof ApiFleetReportModelUsageSchema>;
export type FleetReportSkillBreakdown = z.infer<typeof ApiFleetReportSkillBreakdownSchema>;
export type FleetReportFailure = z.infer<typeof ApiFleetReportFailureSchema>;
export type FleetReportActor = z.infer<typeof ApiFleetReportActorSchema>;
