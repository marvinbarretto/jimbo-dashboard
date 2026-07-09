// Mirrors jimbo-api/src/schemas/entities.ts — the who/what-is-X registry,
// accreted from clarification answers ("Kaj's my accountant" -> person:Kaj)
// so assumption-scan never asks about a known name twice. Unrelated to
// InterrogateEntityId (domain/ids.ts), which is the interrogate module's own
// psychology-style self-model.
import type { EntityRegistryId } from '@domain/ids';

export type EntityRegistryKind = 'person' | 'place' | 'org' | 'thing';

export interface EntityRegistryEntry {
  id: EntityRegistryId;
  kind: EntityRegistryKind;
  name: string;
  aliases: string[];
  description: string | null;
  source_clarification_id: string | null;
  created_at: string;
  updated_at: string;
}
