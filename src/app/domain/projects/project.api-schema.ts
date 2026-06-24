// Runtime contract for /api/projects responses. See actor.api-schema.ts for
// the rationale — same pattern: parse at the boundary, refuse junk early.
//
// One twist: prod stores `status` as 'active' | 'paused' | 'archived' but the
// dashboard collapses 'paused' into 'active' (see Project domain type). We
// represent that with a transform after parsing the wider DB enum, so the
// schema rejects anything outside the known three but normalises to the
// dashboard's two-state lifecycle.
import { z } from 'zod';

export const ApiProjectAutonomyLevelSchema = z.enum(['none', 'propose', 'ship']);

// Per-repo card for multi-repo projects (jsonb `repos`). Absent on older API
// builds → null.
export const ApiProjectRepoSchema = z.object({
  repo:            z.string(),
  role:            z.string().nullish().transform(v => v ?? null),
  entry_points:    z.string().nullish().transform(v => v ?? null),
  footguns:        z.string().nullish().transform(v => v ?? null),
  conventions_url: z.string().nullish().transform(v => v ?? null),
  autonomy_level:  ApiProjectAutonomyLevelSchema.nullish().transform(v => v ?? null),
});

export const ApiProjectSchema = z.object({
  id:             z.string().min(1),
  display_name:   z.string().min(1),
  description:    z.string().nullable(),
  // DB enum is wider than the dashboard's lifecycle. Parse the full set,
  // then collapse 'paused' → 'active' to match the domain Project type.
  status:         z.enum(['active', 'paused', 'archived'])
                    .transform(s => s === 'archived' ? 'archived' as const : 'active' as const),
  kind:           z.enum(['major', 'minor', 'admin']),
  owner_actor_id: z.string().min(1).nullable(),
  criteria:       z.string().nullable(),
  repo_url:       z.string().nullable(),
  // `.nullish()` not `.nullable()` — the API may not emit this column yet
  // (the projects_color_token migration isn't applied on every backend).
  // Absent → null, same as the brief fields below.
  color_token:    z.string().nullish().transform(v => v ?? null),
  created_at:     z.string(),
  updated_at:     z.string().optional(),
  // Manifest-sync provenance; absent on older API builds → null.
  synced_at:      z.string().nullish().transform(v => v ?? null),
  repos:          z.array(ApiProjectRepoSchema).nullish().transform(v => v ?? null),

  // Brief fields — `.nullish()` so older API builds that don't yet emit the
  // column (null vs absent) parse cleanly. Normalised to `null` on the
  // dashboard side so consumers only handle one empty shape.
  intent:           z.string().nullish().transform(v => v ?? null),
  personas:         z.string().nullish().transform(v => v ?? null),
  success_criteria: z.string().nullish().transform(v => v ?? null),
  current_state:    z.string().nullish().transform(v => v ?? null),
  out_of_scope:     z.string().nullish().transform(v => v ?? null),
  key_resources:    z.string().nullish().transform(v => v ?? null),
  entry_points:     z.string().nullish().transform(v => v ?? null),
  deploy_target:    z.string().nullish().transform(v => v ?? null),
  observability:    z.string().nullish().transform(v => v ?? null),
  conventions_url:  z.string().nullish().transform(v => v ?? null),
  footguns:         z.string().nullish().transform(v => v ?? null),
  autonomy_level:   ApiProjectAutonomyLevelSchema.nullish().transform(v => v ?? null),
  current_blocker:  z.string().nullish().transform(v => v ?? null),
  common_tasks:     z.string().nullish().transform(v => v ?? null),
});

export type ApiProject = z.infer<typeof ApiProjectSchema>;

export const ApiProjectListSchema = z.object({
  items: z.array(ApiProjectSchema),
});
