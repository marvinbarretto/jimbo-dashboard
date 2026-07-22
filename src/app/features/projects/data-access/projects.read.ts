// Type-narrowed read surface over ProjectsService.
//
// Why this exists. The path-based ESLint rule (VAULT-COMMANDS-001) blocks
// runtime imports of `*.service` outside the seam directories. Leaf
// components that only need to resolve a project by id can
// `inject(PROJECTS_READ)` and import THIS file — the path doesn't end in
// `*.service`, so the rule allows it. See docs/architecture/lint-rules.md.
//
// ProjectsService owns create/update/remove; none of them belong here. The
// narrowing is the point — a consumer of this token cannot reach a mutation
// even by accident.
//
// The token uses `factory: () => inject(ProjectsService)` so it never
// creates a second instance — the same singleton backs both surfaces.

import { InjectionToken, Signal, inject } from '@angular/core';
import type { Project } from '@domain/projects';
import type { ProjectId } from '@domain/ids';

import { ProjectsService } from './projects.service';

/** Read-only view of the projects store: the list, the active subset, lookup. */
export interface ProjectsRead {
  readonly projects: Signal<readonly Project[]>;
  readonly activeProjects: Signal<readonly Project[]>;
  readonly isLoading: Signal<boolean>;
  getById(id: ProjectId | string): Project | undefined;
}

/**
 * DI token for the read surface. Components that only read should
 * `inject(PROJECTS_READ)` rather than `inject(ProjectsService)` — same
 * singleton, lint-clean import path, no reachable mutations.
 */
export const PROJECTS_READ = new InjectionToken<ProjectsRead>('PROJECTS_READ', {
  providedIn: 'root',
  factory: () => inject(ProjectsService),
});
