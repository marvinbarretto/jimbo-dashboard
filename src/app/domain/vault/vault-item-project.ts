import type { ProjectId, VaultItemId } from '../ids';

// Many-to-many junction between vault items and projects.
// Most items belong to one project, but cross-project work is a real case
// (e.g. a bug that affects LocalShout AND SpoonsCount), and modelling it as a junction
// from the start avoids a painful FK-to-junction migration later.
//
// Deliberately minimal:
//   - No `is_primary` flag. If disambiguation is ever needed, add then.
//   - No `created_at`. Linkage is a mutation and produces an activity event —
//     the event carries the timestamp.

export interface VaultItemProject {
  vault_item_id: VaultItemId;   // composite PK part 1
  project_id:    ProjectId;     // composite PK part 2
}

export type CreateVaultItemProjectPayload = VaultItemProject;
