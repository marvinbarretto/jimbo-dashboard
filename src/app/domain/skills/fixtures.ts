import type { Skill } from './skill';

// Seed-mode fixtures. Mirror the production hub/skills/ shape so dev mode
// matches the real registry. Body intentionally short — fixtures are
// shape-correct, not content-faithful.

export const SKILLS = [
  {
    id: 'vault-grooming/analyse',
    name: 'vault-grooming-analyse',
    description: 'Analyse a single vault note and populate grooming metadata.',
    metadata: {
      requires: ['fast'],
      timeout_minutes: 5,
      required_context: ['note_id'],
      produces: ['tags', 'ai_priority', 'actionability'],
      completes_dispatch: true,
    },
    body: '\nYou are a grooming agent. (seed-mode placeholder)\n',
  },
  {
    id: 'vault-grooming/decompose',
    name: 'vault-grooming-decompose',
    description: 'Break a multi-skill vault note into single-skill subtasks.',
    metadata: {
      requires: ['frontier'],
      timeout_minutes: 8,
      required_context: ['note_id'],
      produces: ['subtasks', 'rationale'],
      completes_dispatch: true,
    },
    body: '\nYou are a decomposition agent. (seed-mode placeholder)\n',
  },
  {
    id: 'code/pr-from-issue',
    name: 'code-pr-from-issue',
    description: 'Coding agent — implement a task end-to-end and open a PR.',
    metadata: {
      requires: ['frontier', 'long-context'],
      timeout_minutes: 60,
      required_context: ['task_id'],
      produces: ['pr_url', 'branch'],
      completes_dispatch: false,
    },
    body: '\nYou are an autonomous coding agent. (seed-mode placeholder)\n',
  },
] as const satisfies readonly Skill[];
