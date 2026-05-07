// Runtime contract for what the dashboard expects back from /api/actors.
//
// Why a Zod schema, not just a TypeScript interface?
//   The interface gives compile-time confidence. The schema gives RUNTIME
//   validation: if the API returns junk (a renamed field, a removed enum
//   value, a typo'd actor id, an `unassigned` sentinel substituted for a
//   real id), .parse() throws and we surface the problem instead of letting
//   it propagate as a "valid" branded ActorId.
//
// We narrow at the boundary: the schema rejects unknown `kind` / `runtime`
// values rather than coercing them. This is the inverse of the old
// narrowKind/narrowRuntime helpers, which silently accepted bad data.
import { z } from 'zod';
import { ALL_CAPABILITIES } from '../capability';

// `id` is the slug ('marvin', 'ralph', etc). Branding happens at the service
// boundary after parse — the schema just guarantees the string is non-empty.
export const ApiActorSchema = z.object({
  id:           z.string().min(1),
  display_name: z.string().min(1),
  kind:         z.enum(['human', 'agent', 'system']),
  runtime:      z.enum(['ollama', 'anthropic', 'openrouter', 'hermes']).nullable(),
  description:  z.string().nullable(),
  is_active:    z.boolean(),
  // The API may not yet return `serves`. Defaulting to [] at parse time
  // lets the dashboard build stay green ahead of the backend rollout.
  // Unknown capability strings are dropped (filtered to the closed set).
  serves:       z.array(z.string()).nullable().optional()
                  .transform(arr => (arr ?? []).filter(
                    (s): s is typeof ALL_CAPABILITIES[number] =>
                      (ALL_CAPABILITIES as readonly string[]).includes(s)
                  )),
  // Kept for completeness even though the dashboard doesn't surface it yet.
  color_token:  z.string().nullable().optional(),
  created_at:   z.string(),
  updated_at:   z.string(),
});

export type ApiActor = z.infer<typeof ApiActorSchema>;

// /api/actors returns a raw array, not an {items} envelope. The OpenAPI route
// declares `schema: ActorSchema.array()` (jimbo-api/src/routes/actors.ts).
// The old dashboard code destructured `{items}` from this and got undefined,
// silently rendering an empty actors page — which was the actual root cause
// of the "@unassigned" chip bug (actorsService never had any rows to look up).
export const ApiActorListSchema = z.array(ApiActorSchema);
