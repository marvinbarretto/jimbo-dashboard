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
  id:           z.string(),
  machine:      z.string().nullable(),
  status:       z.string().nullable(),
  checked_at:   z.string().nullable(),
  // 'cooldown' heartbeats set this: the worker is deliberately quiet until
  // then (quota throttle), not dead. Optional so the page tolerates an API
  // that predates the field.
  next_poll_at: z.string().nullable().optional().default(null),
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
  // Nullable for the same reason as ApiFleetBurnRowSchema.estimated_cost:
  // an unpriced model must not be able to take the whole page down.
  estimated_cost:    z.number().nullable(),
});

export const ApiFleetBurnRowSchema = z.object({
  actor:          z.string().nullable(),
  model:          z.string(),
  turns:          z.number().int(),
  input_tokens:   z.number().int(),
  output_tokens:  z.number().int(),
  // Nullable: the API returns null when the model has no pricing row, which
  // happens whenever a turn is recorded under a tier alias ('haiku'/'sonnet')
  // rather than a resolved model id ('claude-haiku-4-5-20251001'). Declaring
  // this non-nullable took the WHOLE fleet page down with "Fleet stats
  // malformed" the moment one unpriced turn entered the 5h window — a cost
  // we cannot price should blank one cell, not the page.
  estimated_cost: z.number().nullable(),
});

export const ApiFleetFoldSchema = z.object({
  skill:             z.string().nullable(),
  last_enqueued_at:  z.string().nullable(),
  last_completed_at: z.string().nullable(),
  last_status:       z.string().nullable(),
  runs_7d:           z.number().int(),
});

// Running dispatch with the note title joined on — "jeffrey: decomposing
// 'Audit film entity schema…'" rather than a bare count.
export const ApiFleetRunningSchema = z.object({
  id:         z.string(),
  task_id:    z.string(),
  note_title: z.string().nullable(),
  skill:      z.string().nullable(),
  flow:       z.string(),
  executor:   z.string().nullable(),
  started_at: z.string().nullable(),
});

// Failed dispatch in the trailing 24h — the explicit error feed this page flags.
export const ApiFleetFailureSchema = z.object({
  id:            z.string(),
  task_id:       z.string(),
  note_title:    z.string().nullable(),
  skill:         z.string().nullable(),
  flow:          z.string(),
  executor:      z.string().nullable(),
  error_message: z.string().nullable(),
  retry_count:   z.number().int(),
  completed_at:  z.string().nullable(),
  // Notification-bar dismiss. Optional-with-default: landed after this feed
  // did, and an API predating it must not fail parsing.
  dismissed_at:  z.string().nullable().optional().default(null),
});

// Note the grooming machinery parked: lock held past the reap window, no
// active dispatch — invisible everywhere else on the dashboard.
export const ApiFleetStuckNoteSchema = z.object({
  note_id:             z.string(),
  seq:                 z.string().nullable(),
  title:               z.string().nullable(),
  grooming_status:     z.string().nullable(),
  retry_count:         z.number().int(),
  grooming_started_at: z.string().nullable(),
});

export const ApiFleetStatsSchema = z.object({
  generated_at: z.string(),
  queue:        z.array(ApiFleetQueueDepthSchema),
  workers:      z.array(ApiFleetWorkerSchema),
  recent:       z.array(ApiFleetCompletionSchema),
  burn_5h:      z.array(ApiFleetBurnRowSchema),
  folds:        z.array(ApiFleetFoldSchema),
  // Optional-with-default: these landed 2026-07-31; the page must tolerate an
  // API that predates them rather than going down as "malformed".
  now:          z.array(ApiFleetRunningSchema).optional().default([]),
  failures_24h: z.array(ApiFleetFailureSchema).optional().default([]),
  stuck_notes:  z.array(ApiFleetStuckNoteSchema).optional().default([]),
  last_pipeline_enqueue_at: z.string().nullable().optional().default(null),
});

export type ApiFleetStats = z.infer<typeof ApiFleetStatsSchema>;
export type FleetQueueDepth = z.infer<typeof ApiFleetQueueDepthSchema>;
export type FleetWorker = z.infer<typeof ApiFleetWorkerSchema>;
export type FleetCompletion = z.infer<typeof ApiFleetCompletionSchema>;
export type FleetBurnRow = z.infer<typeof ApiFleetBurnRowSchema>;
export type FleetFold = z.infer<typeof ApiFleetFoldSchema>;
export type FleetRunning = z.infer<typeof ApiFleetRunningSchema>;
export type FleetFailure = z.infer<typeof ApiFleetFailureSchema>;
export type FleetStuckNote = z.infer<typeof ApiFleetStuckNoteSchema>;
