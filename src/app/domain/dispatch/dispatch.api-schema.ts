// Runtime contract for /api/dispatch responses. See actor.api-schema.ts for
// rationale.
//
// Two oddities the schema captures explicitly:
//
//   - id and task_seq can come back as either number or string. Postgres
//     returns int8/numeric as string in Node's pg driver; smaller int4 ids
//     come back as number. We accept either at parse time and coerce in the
//     mapper layer.
//
//   - status is the wider PROD enum; the dashboard collapses it into a
//     DispatchStatus union (see dispatch-queue-entry.ts). The schema parses
//     the wider set so we refuse to accept unknown statuses, but leaves the
//     mapping to the service's narrowStatus helper.
import { z } from 'zod';

const DbDispatchStatus = z.enum([
  'proposed', 'approved', 'dispatching', 'running',
  'rejected', 'completed', 'failed', 'removed',
]);

export const ApiDispatchEntrySchema = z.object({
  id:             z.union([z.number(), z.string()]),
  task_id:        z.string().min(1),
  task_source:    z.string(),
  flow:           z.string(),
  agent_type:     z.string(),
  executor:       z.string().min(1).nullable(),
  skill:          z.string().min(1).nullable(),
  skill_context:  z.unknown(),
  status:         DbDispatchStatus,
  result_summary: z.string().nullable(),
  error_message:  z.string().nullable(),
  retry_count:    z.number().int().nonnegative(),
  proposed_at:    z.string().nullable(),
  approved_at:    z.string().nullable(),
  started_at:     z.string().nullable(),
  completed_at:   z.string().nullable(),
  created_at:     z.string(),
  task_title:     z.string().nullable(),
  task_seq:       z.union([z.number(), z.string()]).nullable(),
});

export type ApiDispatchEntry = z.infer<typeof ApiDispatchEntrySchema>;

export const ApiDispatchesResponseSchema = z.object({
  items: z.array(ApiDispatchEntrySchema),
  total: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
});
