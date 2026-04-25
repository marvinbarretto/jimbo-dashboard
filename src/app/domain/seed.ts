// Aggregator for every fixture collection.
// One import gives you the whole graph — useful for seeding services, the integrity
// spec, and any UI surface that wants to render dummy data.

import { ACTORS, ACTOR_SKILLS } from './actors/fixtures';
import { PROJECTS } from './projects/fixtures';
import { SKILLS, SKILL_TOOLS } from './skills/fixtures';
import { PROMPTS, PROMPT_VERSIONS } from './prompts/fixtures';
import { TOOLS, TOOL_VERSIONS } from './tools/fixtures';
import { MODELS } from './models/fixtures';
import { MODEL_STACKS } from './model-stacks/fixtures';
import {
  VAULT_ITEMS,
  VAULT_ITEM_PROJECTS,
  VAULT_ITEM_DEPENDENCIES,
  VAULT_ITEM_IDS,
} from './vault/fixtures';
import { THREAD_MESSAGES, THREAD_MESSAGE_IDS } from './thread/fixtures';
import { ACTIVITY_EVENTS } from './activity/fixtures';
import { ATTACHMENTS } from './attachments/fixtures';
import { DISPATCH_ENTRIES } from './dispatch/fixtures';

export const SEED = {
  actors: ACTORS,
  actor_skills: ACTOR_SKILLS,
  projects: PROJECTS,
  skills: SKILLS,
  skill_tools: SKILL_TOOLS,
  prompts: PROMPTS,
  prompt_versions: PROMPT_VERSIONS,
  tools: TOOLS,
  tool_versions: TOOL_VERSIONS,
  models: MODELS,
  model_stacks: MODEL_STACKS,
  vault_items: VAULT_ITEMS,
  vault_item_projects: VAULT_ITEM_PROJECTS,
  vault_item_dependencies: VAULT_ITEM_DEPENDENCIES,
  thread_messages: THREAD_MESSAGES,
  activity_events: ACTIVITY_EVENTS,
  attachments: ATTACHMENTS,
  dispatch_entries: DISPATCH_ENTRIES,
} as const;

export { VAULT_ITEM_IDS, THREAD_MESSAGE_IDS };
