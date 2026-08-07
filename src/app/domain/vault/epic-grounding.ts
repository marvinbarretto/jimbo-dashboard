/**
 * When an epic counts as grounded.
 *
 * An epic's trace is what every child renders as its answer to "why are we
 * doing this", so a blank one blanks the whole subtree. But the bar is not the
 * same for every project:
 *
 *   Product projects state `success_criteria`, so an epic should say which one
 *   it moves as well as who it serves.
 *
 *   Enabling infrastructure (jimbo) deliberately states none — it exists to
 *   serve other projects and its real targets live in theirs. Requiring a
 *   criterion there produces invented ones, which is worse than an empty field:
 *   an invented criterion looks like grounding and isn't.
 *
 * Naming the persona is required either way. That is the half that actually
 * answers "who is this for", and every project has personas.
 *
 * Lives here rather than in each surface because the detail view, the project
 * page and `scripts/epic-grounding.ts` all ask this question, and a report that
 * disagreed with the UI would be worse than no report.
 */
import type { VaultItem } from './vault-item';

type GroundableEpic = Pick<VaultItem, 'serves_persona' | 'moves_criterion'>;
type ScopingProject = { readonly success_criteria: string | null };

/** Whether epics in this project should cite a success criterion at all. */
export function criterionExpected(project: ScopingProject | null | undefined): boolean {
  return Boolean(project?.success_criteria?.trim());
}

/**
 * @param epic The epic's stored trace.
 * @param project Its primary project, or null/undefined when unfiled — an
 *   unfiled epic has no criteria to cite, so the persona alone decides.
 */
export function isEpicGrounded(
  epic: GroundableEpic,
  project: ScopingProject | null | undefined,
): boolean {
  if (!epic.serves_persona?.trim()) return false;
  return !criterionExpected(project) || Boolean(epic.moves_criterion?.trim());
}
