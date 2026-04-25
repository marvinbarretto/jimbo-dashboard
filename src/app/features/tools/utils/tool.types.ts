// Canonical shapes live in `domain/tools/`. Kept here as a re-export so existing
// service / container imports stay valid through the migration.
export type {
  Tool,
  HandlerType,
  CreateToolPayload,
  UpdateToolPayload,
  ToolVersion,
  CreateToolVersionPayload,
} from '../../../domain/tools';
