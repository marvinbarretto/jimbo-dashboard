// Runtime contract for GET /api/dispatch/stats (boris-v2 slice 6 —
// fleet observability). Mirrors jimbo-api's FleetStatsSchema
// (src/schemas/dispatch.ts). Zod at the wire boundary, same rationale as
// actor.api-schema.ts: a renamed field or type drift surfaces as a parse
// failure instead of NaN tiles on the dashboard.
import { z } from 'zod';

export const ApiFleetQueueDepthSchema = z.object({
  executor: z.string().nullable(),
  status:   z.string(),
  count:    z.number().int(),
});

export const ApiFleetWorkerSchema = z.object({
  id:         z.string(),
  machine:    z.string().nullable(),
  status:     z.string().nullable(),
  checked_at: z.string().nullable(),
});

export const ApiFleetCompletionSchema = z.object({
  id:                z.string(),
  task_id:           z.string(),
  skill:             z.string().nullable(),
  flow:              z.string(),
  executor:          z.string().nullable(),
  status:            z.string(),
  completed_model:   z.string().nullable(),
  error_message:     z.string().nullable(),
  started_at:        z.string().nullable(),
  completed_at:      z.string().nullable(),
  turns:             z.number().int(),
  input_tokens:      z.number().int(),
  output_tokens:     z.number().int(),
  cache_read_tokens: z.number().int(),
  estimated_cost:    z.number(),
});

export const ApiFleetBurnRowSchema = z.object({
  actor:          z.string().nullable(),
  model:          z.string(),
  turns:          z.number().int(),
  input_tokens:   z.number().int(),
  output_tokens:  z.number().int(),
  estimated_cost: z.number(),
});

export const ApiFleetFoldSchema = z.object({
  skill:             z.string().nullable(),
  last_enqueued_at:  z.string().nullable(),
  last_completed_at: z.string().nullable(),
  last_status:       z.string().nullable(),
  runs_7d:           z.number().int(),
});

export const ApiFleetStatsSchema = z.object({
  generated_at: z.string(),
  queue:        z.array(ApiFleetQueueDepthSchema),
  workers:      z.array(ApiFleetWorkerSchema),
  recent:       z.array(ApiFleetCompletionSchema),
  burn_5h:      z.array(ApiFleetBurnRowSchema),
  folds:        z.array(ApiFleetFoldSchema),
});

export type ApiFleetStats = z.infer<typeof ApiFleetStatsSchema>;
export type FleetQueueDepth = z.infer<typeof ApiFleetQueueDepthSchema>;
export type FleetWorker = z.infer<typeof ApiFleetWorkerSchema>;
export type FleetCompletion = z.infer<typeof ApiFleetCompletionSchema>;
export type FleetBurnRow = z.infer<typeof ApiFleetBurnRowSchema>;
export type FleetFold = z.infer<typeof ApiFleetFoldSchema>;
