// Runtime contract for /api/vault/notes responses. See actor.api-schema.ts
// for rationale.
//
// Some loose fields by design:
//   - `type` accepts any string (production has 16+ values; dashboard splits
//     known ones into type/category, treats the rest as note categories).
//   - `grooming_status` accepts any string (production lags dashboard;
//     unknown values fall back to 'ungroomed' in the mapper).
//   - `actionability` accepts any string (mapper narrows to closed set).
//   - `priority` ints accept any number; mapper narrows to 0..3.
//   - `seq` uses coerce: postgres.js returns bigint (int8) columns as strings
//     in text-protocol mode (prepare: false). The mapper also calls Number()
//     on it, so coerce here is consistent and redundant.
//
// What the schema DOES enforce: status enum, required string ids, nullable
// vs non-nullable consistency with the API contract. That's enough to refuse
// a junk response wholesale rather than substitute defaults silently.
import { z } from 'zod';

const LatestEventSchema = z.object({
  ts:                  z.string(),
  actor_id:            z.string(),
  actor_display_name:  z.string().nullable(),
  action:              z.string(),
  from_value:          z.string().nullable(),
  to_value:            z.string().nullable(),
  reason:              z.string().nullable(),
});

const LatestMessageSchema = z.object({
  created_at:          z.string(),
  author_actor_id:     z.string(),
  author_display_name: z.string().nullable(),
  kind:                z.string(),
  body_excerpt:        z.string(),
});

export const ApiVaultItemSchema = z.object({
  id:                   z.string().min(1),
  seq:                  z.coerce.number(),
  title:                z.string(),
  type:                 z.string(),
  status:               z.enum(['active', 'inbox', 'archived', 'done']),
  body:                 z.string().nullable(),
  ai_priority:          z.number().nullable(),
  manual_priority:      z.number().nullable(),
  priority_confidence:  z.number().nullable(),
  ai_rationale:         z.string().nullable(),
  // Structured "exam" written by hermes/intake-quality — see IntakeRationale
  // in @domain/vault/vault-item.ts. Server-side JSONB; arrives as a parsed
  // object. We accept unknown here and narrow at the consumer.
  intake_rationale:     z.unknown().nullable().optional(),
  actionability:        z.string().nullable(),
  assigned_to:          z.string().min(1),
  route:                z.string(),
  tags:                 z.array(z.string()),
  ready:                z.boolean(),
  is_epic:              z.boolean(),
  parent_id:            z.string().nullable(),
  acceptance_criteria:  z.string().nullable(),
  blocked_by:           z.string().nullable(),
  blocked_reason:       z.string().nullable(),
  blocked_at:           z.string().nullable(),
  due_at:               z.string().nullable(),
  created_at:           z.string(),
  updated_at:           z.string(),
  completed_at:         z.string().nullable(),
  grooming_status:      z.string(),
  grooming_started_at:  z.string().nullable(),
  // Manual-track in-progress marker. Optional+default so a pre-deploy API that
  // doesn't yet return the column still validates.
  started_at:           z.string().nullable().optional().default(null),
  // Human-owner readiness override. Optional+default for the same pre-deploy
  // reason as started_at above.
  // Effort in pomodoro blocks. Optional+default for the same pre-deploy
  // reason as started_at above.
  estimated_blocks:     z.number().nullable().optional().default(null),
  source_kind:          z.string().nullable(),
  source_ref:           z.string().nullable(),
  source_url:           z.string().nullable(),
  source_signal:        z.string().nullable(),

  // Embedded summaries the API joins for board rendering.
  primary_project_id:   z.string().nullable(),
  primary_project_name: z.string().nullable(),
  open_questions_count: z.number().int().nonnegative(),
  latest_activity_at:   z.string().nullable(),
  children_count:           z.number().int().nonnegative(),
  // Per-status breakdown + recent-completion velocity, computed in one
  // LATERAL aggregate in jimbo-api's listBoardNotes. Powers the "X/Y done"
  // and "stalled" indicators on the projects list + project-landing.
  children_done_count:      z.number().int().nonnegative().optional().default(0),
  children_active_count:    z.number().int().nonnegative().optional().default(0),
  children_inbox_count:     z.number().int().nonnegative().optional().default(0),
  children_blocked_count:   z.number().int().nonnegative().optional().default(0),
  children_done_7d:         z.number().int().nonnegative().optional().default(0),
  children_done_30d:        z.number().int().nonnegative().optional().default(0),
  last_child_completed_at:  z.string().nullable().optional().default(null),
  latest_event:         LatestEventSchema.nullable(),
  latest_message:       LatestMessageSchema.nullable(),
  days_in_column:       z.number(),
});

export type ApiVaultItem = z.infer<typeof ApiVaultItemSchema>;

export const ApiVaultItemsResponseSchema = z.object({
  items: z.array(ApiVaultItemSchema),
  total: z.number().int().nonnegative(),
  limit: z.number().int().positive(),
});
