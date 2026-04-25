// Canonical shapes live in `domain/models/`. Kept here as a re-export so existing
// service / container imports stay valid through the migration.
export type {
  Model,
  ModelTier,
  ModelProvider,
  ModelCapability,
  ModelStats,
  CreateModelPayload,
  UpdateModelPayload,
} from '@domain/models';

export { MODEL_CAPABILITIES } from '@domain/models';
