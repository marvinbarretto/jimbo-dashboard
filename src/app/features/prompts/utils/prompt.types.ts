// Canonical shapes live in `domain/prompts/`. Kept here as a re-export so existing
// service / container imports stay valid through the migration.
export type {
  Prompt,
  CreatePromptPayload,
  UpdatePromptPayload,
  PromptVersion,
  CreatePromptVersionPayload,
} from '@domain/prompts';

// Legacy alias — the domain export name is `CreatePromptVersionPayload`; some existing
// callers use `CreateVersionPayload`. Keep the alias until those imports are touched.
export type { CreatePromptVersionPayload as CreateVersionPayload } from '@domain/prompts';
