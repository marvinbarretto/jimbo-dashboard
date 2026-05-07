// Runtime contract for /api/projects responses. See actor.api-schema.ts for
// the rationale — same pattern: parse at the boundary, refuse junk early.
//
// One twist: prod stores `status` as 'active' | 'paused' | 'archived' but the
// dashboard collapses 'paused' into 'active' (see Project domain type). We
// represent that with a transform after parsing the wider DB enum, so the
// schema rejects anything outside the known three but normalises to the
// dashboard's two-state lifecycle.
import { z } from 'zod';

export const ApiProjectSchema = z.object({
  id:             z.string().min(1),
  display_name:   z.string().min(1),
  description:    z.string().nullable(),
  // DB enum is wider than the dashboard's lifecycle. Parse the full set,
  // then collapse 'paused' → 'active' to match the domain Project type.
  status:         z.enum(['active', 'paused', 'archived'])
                    .transform(s => s === 'archived' ? 'archived' as const : 'active' as const),
  kind:           z.enum(['major', 'minor']),
  owner_actor_id: z.string().min(1).nullable(),
  criteria:       z.string().nullable(),
  repo_url:       z.string().nullable(),
  color_token:    z.string().nullable(),
  created_at:     z.string(),
  updated_at:     z.string().optional(),
});

export type ApiProject = z.infer<typeof ApiProjectSchema>;

export const ApiProjectListSchema = z.object({
  items: z.array(ApiProjectSchema),
});
