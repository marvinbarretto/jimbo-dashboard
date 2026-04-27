-- Phase A2 cleanup: drop the wrong-turn DB structure introduced in 0007/0009.
-- The filesystem registry at hub/skills/ is canonical; these tables duplicated
-- it and produced more bugs than value.
--
-- Verified empty before migration:
--   dispatch_queue.skill: 0 non-null rows (FK already dropped in 0010)
--   costs.prompt_version_id: 0 non-null rows
--
-- Pricing reverts to hardcoded sync rates in jimbo-api/src/services/pricing.ts;
-- the models table no longer carries price data. A future Phase B will wire a
-- filesystem-backed skill gate; for now enqueue is gateless apart from the
-- ready-gate restored in Phase A1.

-- Triggers reference the helper functions, so drop them before the functions.
DROP TRIGGER IF EXISTS skills_updated_at        ON skills;--> statement-breakpoint
DROP TRIGGER IF EXISTS tools_updated_at         ON tools;--> statement-breakpoint
DROP TRIGGER IF EXISTS prompts_updated_at       ON prompts;--> statement-breakpoint
DROP TRIGGER IF EXISTS model_stacks_updated_at  ON model_stacks;--> statement-breakpoint
DROP TRIGGER IF EXISTS models_updated_at        ON models;--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_prompt_versions_version ON prompt_versions;--> statement-breakpoint

-- Drop tables in dependency order (skills → prompts/tools/model_stacks → models).
DROP TABLE IF EXISTS "skills" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "prompt_versions" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "prompts" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "tools" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "model_stacks" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "models" CASCADE;--> statement-breakpoint

-- Helper functions used only by the trigger set above.
DROP FUNCTION IF EXISTS set_updated_at();--> statement-breakpoint
DROP FUNCTION IF EXISTS set_prompt_version();--> statement-breakpoint

-- Drop the costs.prompt_version_id column added in 0007.
ALTER TABLE "costs" DROP COLUMN IF EXISTS "prompt_version_id";
