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
  // Commission-flow fields. Present on every row; pr_state/pr_url null when the
  // dispatch isn't a commission or has no PR yet. Kept as permissive strings at
  // the wire boundary — the domain narrows flow/pr_state to open unions.
  pr_state:       z.string().nullable(),
  pr_url:         z.string().nullable(),
  // CI verdict for the PR, refreshed hourly by jimbo-api's reconcilePrStates.
  // The API has served this since 2026-08-27 and the dashboard dropped it here,
  // so the board showed a confident PR link for commissions the review queue
  // was holding back as `red_ci`. `nullish` because older rows predate it and
  // "never checked" is not the same as "no PR".
  pr_checks:      z.string().nullish(),
  retry_count:    z.number().int().nonnegative(),
  proposed_at:    z.string().nullable(),
  approved_at:    z.string().nullable(),
  started_at:     z.string().nullable(),
  completed_at:   z.string().nullable(),
  created_at:     z.string(),
  // Joined from the vault item, and ONLY by the list endpoint: GET
  // /api/dispatch/{id} returns the bare dispatch row without them. Required
  // here, every `dispatch.stage_changed` event on the live stream failed to
  // parse and was dropped — the board advertised "live" while no card moved.
  // `nullish`, not `nullable`: absent and null mean different things to the
  // caller (keep what you had vs. it really is empty).
  task_title:     z.string().nullish(),
  task_seq:       z.union([z.number(), z.string()]).nullish(),
  // Which model actually ran, and the sha of the SKILL.md it ran. Both were
  // being served and silently dropped here (zod strips unknown keys), so the
  // UI could not say that dispatch 5016's 20-second no-op was a haiku run of a
  // skill whose prompt it could not read. `nullish` — older rows predate both.
  completed_model: z.string().nullish(),
  skill_version:   z.string().nullish(),
});

export type ApiDispatchEntry = z.infer<typeof ApiDispatchEntrySchema>;

export const ApiDispatchesResponseSchema = z.object({
  items: z.array(ApiDispatchEntrySchema),
  total: z.number().int().nonnegative(),
});
