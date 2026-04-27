import { z } from '@hono/zod-openapi';

export const ValidationDetail = z.object({
  path: z.string(),
  issue: z.string(),
});

export const ErrorSchema = z
  .object({
    error: z.object({
      code: z.string(),
      message: z.string(),
      request_id: z.string(),
      details: z.array(ValidationDetail).optional(),
    }),
  })
  .openapi('Error');

export const HealthSchema = z
  .object({
    ok: z.boolean(),
    service: z.string(),
    ts: z.string(),
  })
  .openapi('Health');

// Optional limit shared by listing routes that bound their result set.
export function limitQuery(defaultLimit: number, max: number) {
  return z.object({
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(max)
      .default(defaultLimit)
      .openapi({ description: `Max items (1-${max})`, example: defaultLimit }),
  });
}

// Schemas below are intentionally loose. The dashboard is operator-only and
// the response shapes mirror raw database rows with several JSON columns —
// strict per-column validation would be high-churn for low value.
export const VaultItemSchema = z.record(z.string(), z.unknown()).openapi('VaultItem');
export const DispatchSchema = z.record(z.string(), z.unknown()).openapi('Dispatch');
export const ActorSchema = z.record(z.string(), z.unknown()).openapi('Actor');
export const ProjectSchema = z.record(z.string(), z.unknown()).openapi('Project');
export const VaultItemProjectSchema = z.record(z.string(), z.unknown()).openapi('VaultItemProject');

export function listResponse<T extends z.ZodTypeAny>(item: T, extras: z.ZodRawShape = {}) {
  return z.object({
    items: z.array(item),
    ...extras,
  });
}
