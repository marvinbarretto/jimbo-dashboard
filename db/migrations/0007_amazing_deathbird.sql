CREATE TABLE "model_stacks" (
	"id" text PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"description" text,
	"model_ids" text[] DEFAULT '{}'::text[] NOT NULL,
	"fast_model_id" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "models" (
	"id" text PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"provider" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "models_provider_check" CHECK ("models"."provider" IN ('anthropic','google','openai','deepseek','openrouter'))
);
--> statement-breakpoint
CREATE TABLE "prompt_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prompt_id" text NOT NULL,
	"version" integer NOT NULL,
	"system_content" text NOT NULL,
	"user_content" text,
	"input_schema" jsonb,
	"output_schema" jsonb,
	"notes" text,
	"parent_version_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prompts" (
	"id" text PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"description" text,
	"current_version_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tools" (
	"id" text PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"description" text NOT NULL,
	"handler_type" text DEFAULT 'http' NOT NULL,
	"endpoint_url" text,
	"input_schema" jsonb NOT NULL,
	"output_schema" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tools_handler_type_check" CHECK ("tools"."handler_type" IN ('http','internal'))
);
--> statement-breakpoint
CREATE TABLE "skills" (
	"id" text PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"description" text,
	"kind" text NOT NULL,
	"prompt_id" text,
	"model_stack_id" text,
	"allowed_executors" text[] DEFAULT '{}'::text[] NOT NULL,
	"tool_ids" text[] DEFAULT '{}'::text[] NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "skills_kind_check" CHECK ("skills"."kind" IN ('groom','classify','decompose','execute','recon'))
);
--> statement-breakpoint
ALTER TABLE "model_stacks" ADD CONSTRAINT "model_stacks_fast_model_id_models_id_fk" FOREIGN KEY ("fast_model_id") REFERENCES "public"."models"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompt_versions" ADD CONSTRAINT "prompt_versions_prompt_id_prompts_id_fk" FOREIGN KEY ("prompt_id") REFERENCES "public"."prompts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skills" ADD CONSTRAINT "skills_prompt_id_prompts_id_fk" FOREIGN KEY ("prompt_id") REFERENCES "public"."prompts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "skills" ADD CONSTRAINT "skills_model_stack_id_model_stacks_id_fk" FOREIGN KEY ("model_stack_id") REFERENCES "public"."model_stacks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_model_stacks_active" ON "model_stacks" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_models_active" ON "models" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_models_provider" ON "models" USING btree ("provider");--> statement-breakpoint
CREATE INDEX "idx_prompt_versions_prompt" ON "prompt_versions" USING btree ("prompt_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_prompt_versions_prompt_version" ON "prompt_versions" USING btree ("prompt_id","version");--> statement-breakpoint
CREATE INDEX "idx_prompts_active" ON "prompts" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_tools_active" ON "tools" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_skills_active" ON "skills" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_skills_kind" ON "skills" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "idx_skills_prompt" ON "skills" USING btree ("prompt_id");--> statement-breakpoint
CREATE INDEX "idx_skills_model_stack" ON "skills" USING btree ("model_stack_id");--> statement-breakpoint
-- Circular FK appended manually: prompts.current_version_id → prompt_versions.id
ALTER TABLE "prompts" ADD CONSTRAINT "fk_prompts_current_version" FOREIGN KEY ("current_version_id") REFERENCES "public"."prompt_versions"("id") ON DELETE SET NULL ON UPDATE no action;--> statement-breakpoint
-- Auto-assign prompt_versions.version per prompt_id (1, 2, 3, …)
CREATE OR REPLACE FUNCTION set_prompt_version() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.version IS NULL OR NEW.version = 0 THEN
    SELECT COALESCE(MAX(version), 0) + 1 INTO NEW.version
    FROM prompt_versions WHERE prompt_id = NEW.prompt_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER trg_prompt_versions_version BEFORE INSERT ON prompt_versions
  FOR EACH ROW EXECUTE FUNCTION set_prompt_version();--> statement-breakpoint
-- Auto-update updated_at on row change for tables that have it
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE TRIGGER models_updated_at        BEFORE UPDATE ON models        FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER model_stacks_updated_at  BEFORE UPDATE ON model_stacks  FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER prompts_updated_at       BEFORE UPDATE ON prompts       FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER tools_updated_at         BEFORE UPDATE ON tools         FOR EACH ROW EXECUTE FUNCTION set_updated_at();--> statement-breakpoint
CREATE TRIGGER skills_updated_at        BEFORE UPDATE ON skills        FOR EACH ROW EXECUTE FUNCTION set_updated_at();