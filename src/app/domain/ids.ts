// Branded IDs. One place. Everything points here.
//
// Why: passing plain `string` around means you can hand a SkillId to a function
// that wants an ActorId and TypeScript won't care. Branding fixes that with
// zero runtime cost — at compile time the brand is a phantom marker, at
// runtime the value is just a string.
//
// Conventions:
//   - IDs are always strings. Most are slugs ('marvin', 'strict-ac-builder').
//     Activity events and prompt versions use UUIDs.
//   - The `brand` helpers let you tag a plain string when reading from an API.
//     Anywhere inside the app the branded type is inferred from context.

type Brand<T, B extends string> = T & { readonly __brand: B };

// Mirror of jimbo-api/src/schemas/actors.ts KNOWN_ACTORS. Hand-synced until
// the monorepo lands and a shared package can own the source of truth (see
// docs/architecture/phase-b-followups.md §9b). Adding a new actor takes a
// matching update in BOTH repos.
export const KNOWN_ACTORS = ['jimbo', 'marvin', 'ralph', 'boris'] as const;
export type WellKnownActorId = (typeof KNOWN_ACTORS)[number];

export type ActorId        = Brand<string, 'ActorId'>;
export type VaultItemId    = Brand<string, 'VaultItemId'>;
export type ActivityId     = Brand<string, 'ActivityId'>;
export type SkillId        = Brand<string, 'SkillId'>;
export type ModelId        = Brand<string, 'ModelId'>;
export type ModelStackId   = Brand<string, 'ModelStackId'>;
export type PromptId       = Brand<string, 'PromptId'>;
export type PromptVersionId = Brand<string, 'PromptVersionId'>;
export type ToolId         = Brand<string, 'ToolId'>;
export type ToolVersionId  = Brand<string, 'ToolVersionId'>;
export type ProjectId      = Brand<string, 'ProjectId'>;
export type ThreadMessageId = Brand<string, 'ThreadMessageId'>;
export type AttachmentId   = Brand<string, 'AttachmentId'>;
export type DispatchId     = Brand<string, 'DispatchId'>;

// Constructor helpers. Use at API boundaries where the raw string arrives.
// Inside the app, prefer passing the branded type around.
export const actorId         = (v: string): ActorId         => v as ActorId;
export const vaultItemId     = (v: string): VaultItemId     => v as VaultItemId;
export const activityId      = (v: string): ActivityId      => v as ActivityId;
export const skillId         = (v: string): SkillId         => v as SkillId;
export const modelId         = (v: string): ModelId         => v as ModelId;
export const modelStackId    = (v: string): ModelStackId    => v as ModelStackId;
export const promptId        = (v: string): PromptId        => v as PromptId;
export const promptVersionId = (v: string): PromptVersionId => v as PromptVersionId;
export const toolId          = (v: string): ToolId          => v as ToolId;
export const toolVersionId   = (v: string): ToolVersionId   => v as ToolVersionId;
export const projectId       = (v: string): ProjectId       => v as ProjectId;
export const threadMessageId = (v: string): ThreadMessageId => v as ThreadMessageId;
export const attachmentId    = (v: string): AttachmentId    => v as AttachmentId;
export const dispatchId      = (v: string): DispatchId      => v as DispatchId;
