// Runtime contract for GET /api/vault/types.
//
// The API owns the vault's type vocabulary and the rules attached to each type
// (jimbo-api src/services/vault-types.ts). That same table drives the server's
// ready gate, so the dashboard asking for it is the difference between the UI
// agreeing with the gate and the UI guessing at it.
//
// `type` stays a plain string rather than an enum: vault_notes.type is
// free-text server-side (schemas/vault.ts: `type: z.string()`), so narrowing
// here would reject rows the database happily holds.
import { z } from 'zod';

export const ApiVaultTypeSpecSchema = z.object({
  type:                    z.string().min(1),
  label:                   z.string().min(1),
  hint:                    z.string(),
  actionable:              z.boolean(),
  needsAcceptanceCriteria: z.boolean(),
  needsActionability:      z.boolean(),
  carriesPriority:         z.boolean(),
});

export const ApiVaultTypeSpecListSchema = ApiVaultTypeSpecSchema.array();

export type ApiVaultTypeSpec = z.infer<typeof ApiVaultTypeSpecSchema>;
