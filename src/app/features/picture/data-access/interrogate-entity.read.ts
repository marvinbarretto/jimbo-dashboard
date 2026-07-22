// Type-narrowed read surface over InterrogateEntityService.
//
// Why this exists. The path-based ESLint rule (VAULT-COMMANDS-001) blocks
// runtime imports of `*.service` outside the seam directories. A leaf card
// that only lists evidence can `inject(INTERROGATE_ENTITY_READ)` and import
// THIS file — the path doesn't end in `*.service`, so the rule allows it.
// See docs/architecture/lint-rules.md.
//
// The service's other two methods, `update` and `addEvidence`, are writes
// and are deliberately absent. They compose a PATCH/POST with a toast and a
// snapshot refresh, which is precisely the kind of multi-store composition
// the command layer exists to own — never widen this interface to include
// them.
//
// The token uses `factory: () => inject(InterrogateEntityService)` so it
// never creates a second instance — the same singleton backs both surfaces.

import { InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { InterrogateEntityType, InterrogateEvidence } from '@domain/interrogate';
import type { InterrogateEntityId } from '@domain/ids';

import { InterrogateEntityService } from './interrogate-entity.service';

/** Read-only view of interrogate entities: the evidence list. */
export interface InterrogateEntityRead {
  listEvidence(
    entityType: InterrogateEntityType,
    id: InterrogateEntityId,
  ): Observable<{ evidence: InterrogateEvidence[] }>;
}

/**
 * DI token for the read surface. Components that only read should
 * `inject(INTERROGATE_ENTITY_READ)` rather than
 * `inject(InterrogateEntityService)` — same singleton, lint-clean import
 * path, no reachable mutations.
 */
export const INTERROGATE_ENTITY_READ = new InjectionToken<InterrogateEntityRead>(
  'INTERROGATE_ENTITY_READ',
  {
    providedIn: 'root',
    factory: () => inject(InterrogateEntityService),
  },
);
