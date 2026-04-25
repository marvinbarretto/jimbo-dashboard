CREATE TABLE "vault_candidates" (
	"id" text PRIMARY KEY NOT NULL,
	"email_id" integer NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"proposed_priority" integer,
	"confidence" real NOT NULL,
	"rationale" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"decided_at" timestamp with time zone,
	"created_vault_note_id" text,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vault_candidates_status_check" CHECK ("vault_candidates"."status" IN ('pending', 'accepted', 'rejected', 'modified'))
);
--> statement-breakpoint
CREATE TABLE "vault_item_dependencies" (
	"blocker_id" text NOT NULL,
	"blocked_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vault_item_dependencies_blocker_id_blocked_id_pk" PRIMARY KEY("blocker_id","blocked_id")
);
--> statement-breakpoint
CREATE TABLE "activities" (
	"id" text PRIMARY KEY NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"task_type" text NOT NULL,
	"description" text NOT NULL,
	"outcome" text,
	"rationale" text,
	"model_used" text,
	"cost_id" text,
	"satisfaction" integer,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "note_links" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"source_note_id" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "note_links_source_target_unique" UNIQUE("source_note_id","target_type","target_id"),
	CONSTRAINT "note_links_target_type_check" CHECK ("note_links"."target_type" IN ('vault_note', 'context_item')),
	CONSTRAINT "note_links_no_self_link_check" CHECK (NOT ("note_links"."target_type" = 'vault_note' AND "note_links"."target_id" = "note_links"."source_note_id"))
);
--> statement-breakpoint
CREATE TABLE "note_thread" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"note_id" text NOT NULL,
	"author" text NOT NULL,
	"content" text NOT NULL,
	"reply_to_id" bigint,
	"is_correction" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grooming_corrections" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"note_id" text NOT NULL,
	"stage" text NOT NULL,
	"field" text NOT NULL,
	"ai_value" text NOT NULL,
	"corrected_value" text NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grooming_corrections_ingested" (
	"correction_id" bigint PRIMARY KEY NOT NULL,
	"ingested_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grooming_lessons" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"trigger" text NOT NULL,
	"guidance" text NOT NULL,
	"active" boolean DEFAULT false NOT NULL,
	"hit_count" integer DEFAULT 0 NOT NULL,
	"miss_count" integer DEFAULT 0 NOT NULL,
	"supersedes_id" bigint,
	"created_by" text NOT NULL,
	"source_correction_ids" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"activated_at" timestamp with time zone,
	"last_cited_at" timestamp with time zone,
	"deprecated_at" timestamp with time zone,
	"deprecated_reason" text
);
--> statement-breakpoint
CREATE TABLE "grooming_proposals" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"parent_note_id" text NOT NULL,
	"proposed_by" text NOT NULL,
	"proposal" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"feedback" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "context_files" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "context_files_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" text NOT NULL,
	"display_name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "context_files_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "context_items" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "context_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"section_id" integer NOT NULL,
	"label" text,
	"content" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"timeframe" text,
	"status" text,
	"category" text,
	"expires_at" timestamp with time zone,
	CONSTRAINT "context_items_status_check" CHECK ("context_items"."status" IS NULL OR "context_items"."status" IN ('active', 'paused', 'completed', 'deferred')),
	CONSTRAINT "context_items_category_check" CHECK ("context_items"."category" IS NULL OR "context_items"."category" IN ('project', 'life-area', 'habit', 'one-off'))
);
--> statement-breakpoint
CREATE TABLE "context_sections" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "context_sections_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"file_id" integer NOT NULL,
	"name" text NOT NULL,
	"format" text DEFAULT 'list' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coach_logs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "coach_logs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"supplement_id" text NOT NULL,
	"taken_at" timestamp with time zone DEFAULT now() NOT NULL,
	"dosage" real NOT NULL,
	"source" text NOT NULL,
	"nudge_id" integer,
	"notes" text,
	CONSTRAINT "coach_logs_source_check" CHECK ("coach_logs"."source" IN ('in_app','telegram_deeplink','manual'))
);
--> statement-breakpoint
CREATE TABLE "coach_nudges" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "coach_nudges_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"nudge_key" text NOT NULL,
	"anchor" text NOT NULL,
	"supplements" text NOT NULL,
	"scheduled_for" timestamp with time zone NOT NULL,
	"pushed_at" timestamp with time zone,
	"delivered_via" text,
	"state" text DEFAULT 'pending' NOT NULL,
	"action_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "coach_nudges_nudge_key_unique" UNIQUE("nudge_key"),
	CONSTRAINT "coach_nudges_state_check" CHECK ("coach_nudges"."state" IN ('pending','logged','skipped','expired'))
);
--> statement-breakpoint
CREATE TABLE "coach_supplements" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text,
	"dose_amount" real NOT NULL,
	"dose_unit" text NOT NULL,
	"conditions" text DEFAULT '{}' NOT NULL,
	"timing_tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"rationale_short" text NOT NULL,
	"rationale_long" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"remaining_amount" real,
	"loading_started_at" timestamp with time zone,
	"loading_daily_dose" real,
	"loading_duration_days" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "coach_supplements_type_check" CHECK ("coach_supplements"."type" IN ('protein','creatine','vitamin','other'))
);
--> statement-breakpoint
CREATE TABLE "bakeoff_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"capability" text NOT NULL,
	"model" text NOT NULL,
	"score" real NOT NULL,
	"cost_usd" real NOT NULL,
	"flags" text,
	"sample_n" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pipeline_runs" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "pipeline_runs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"session" text NOT NULL,
	"status" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"duration_ms" integer,
	"steps" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"opus_status" text,
	"opus_error" text,
	"opus_posted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "runs" (
	"run_id" text PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"parent_run_id" text,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"model" text NOT NULL,
	"config_hash" text,
	"input_tokens" integer,
	"output_tokens" integer,
	"cost_usd" real,
	"duration_ms" integer,
	"input_summary" text,
	"output_summary" text,
	"quality_scores" jsonb,
	"conductor_rating" integer,
	"user_rating" integer,
	"user_notes" text,
	"conductor_reasoning" text,
	"session" text
);
--> statement-breakpoint
CREATE TABLE "email_reports" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"gmail_id" text NOT NULL,
	"thread_id" text DEFAULT '' NOT NULL,
	"processed_at" timestamp with time zone NOT NULL,
	"from_name" text DEFAULT '' NOT NULL,
	"from_email" text NOT NULL,
	"subject" text NOT NULL,
	"body_analysis" text NOT NULL,
	"links" text DEFAULT '[]' NOT NULL,
	"model" text DEFAULT '' NOT NULL,
	"processing_time_seconds" real DEFAULT 0,
	"decided" boolean DEFAULT false NOT NULL,
	"decided_at" timestamp with time zone,
	"decision" text,
	"relevance_score" integer,
	"source" text DEFAULT 'email' NOT NULL,
	"body_text" text DEFAULT '' NOT NULL,
	"forwarded_to_localshout" text,
	"enrichment_prompt_id" text,
	"enrichment_prompt_version" integer,
	"enrichment_model" text,
	"enrichment_reasoning" text,
	"enrichment_cost_cents" real,
	"enrichment_tokens_input" integer,
	"enrichment_tokens_output" integer,
	"enriched_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "email_reports_gmail_id_unique" UNIQUE("gmail_id")
);
--> statement-breakpoint
CREATE TABLE "briefing_analyses" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"session" text NOT NULL,
	"model" text NOT NULL,
	"generated_at" timestamp with time zone NOT NULL,
	"analysis" text NOT NULL,
	"user_rating" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_summaries" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"product" text NOT NULL,
	"app" text NOT NULL,
	"environment" text NOT NULL,
	"summary_type" text NOT NULL,
	"window" text NOT NULL,
	"generated_at" timestamp with time zone NOT NULL,
	"payload" text NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_summaries_slot_unique" UNIQUE("product","app","environment","summary_type","window")
);
--> statement-breakpoint
ALTER TABLE "vault_candidates" ADD CONSTRAINT "vault_candidates_created_vault_note_id_vault_notes_id_fk" FOREIGN KEY ("created_vault_note_id") REFERENCES "public"."vault_notes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vault_item_dependencies" ADD CONSTRAINT "vault_item_dependencies_blocker_id_vault_notes_id_fk" FOREIGN KEY ("blocker_id") REFERENCES "public"."vault_notes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vault_item_dependencies" ADD CONSTRAINT "vault_item_dependencies_blocked_id_vault_notes_id_fk" FOREIGN KEY ("blocked_id") REFERENCES "public"."vault_notes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_links" ADD CONSTRAINT "note_links_source_note_id_vault_notes_id_fk" FOREIGN KEY ("source_note_id") REFERENCES "public"."vault_notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_thread" ADD CONSTRAINT "note_thread_note_id_vault_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."vault_notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_thread" ADD CONSTRAINT "note_thread_reply_to_id_note_thread_id_fk" FOREIGN KEY ("reply_to_id") REFERENCES "public"."note_thread"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grooming_corrections" ADD CONSTRAINT "grooming_corrections_note_id_vault_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."vault_notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grooming_corrections_ingested" ADD CONSTRAINT "grooming_corrections_ingested_correction_id_grooming_corrections_id_fk" FOREIGN KEY ("correction_id") REFERENCES "public"."grooming_corrections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grooming_proposals" ADD CONSTRAINT "grooming_proposals_parent_note_id_vault_notes_id_fk" FOREIGN KEY ("parent_note_id") REFERENCES "public"."vault_notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "context_items" ADD CONSTRAINT "context_items_section_id_context_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."context_sections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "context_sections" ADD CONSTRAINT "context_sections_file_id_context_files_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."context_files"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_logs" ADD CONSTRAINT "coach_logs_supplement_id_coach_supplements_id_fk" FOREIGN KEY ("supplement_id") REFERENCES "public"."coach_supplements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_logs" ADD CONSTRAINT "coach_logs_nudge_id_coach_nudges_id_fk" FOREIGN KEY ("nudge_id") REFERENCES "public"."coach_nudges"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "runs" ADD CONSTRAINT "runs_parent_run_id_runs_run_id_fk" FOREIGN KEY ("parent_run_id") REFERENCES "public"."runs"("run_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_vault_candidates_email" ON "vault_candidates" USING btree ("email_id");--> statement-breakpoint
CREATE INDEX "idx_vault_candidates_status" ON "vault_candidates" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_dependencies_blocked" ON "vault_item_dependencies" USING btree ("blocked_id");--> statement-breakpoint
CREATE INDEX "idx_dependencies_blocker" ON "vault_item_dependencies" USING btree ("blocker_id");--> statement-breakpoint
CREATE INDEX "idx_activities_ts" ON "activities" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "idx_activities_type" ON "activities" USING btree ("task_type");--> statement-breakpoint
CREATE INDEX "idx_note_links_source" ON "note_links" USING btree ("source_note_id");--> statement-breakpoint
CREATE INDEX "idx_note_links_target" ON "note_links" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "idx_note_thread_note" ON "note_thread" USING btree ("note_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_corrections_field" ON "grooming_corrections" USING btree ("field");--> statement-breakpoint
CREATE INDEX "idx_corrections_stage" ON "grooming_corrections" USING btree ("stage","created_at");--> statement-breakpoint
CREATE INDEX "idx_lessons_active" ON "grooming_lessons" USING btree ("active");--> statement-breakpoint
CREATE INDEX "idx_lessons_kind" ON "grooming_lessons" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "idx_grooming_proposals_parent" ON "grooming_proposals" USING btree ("parent_note_id");--> statement-breakpoint
CREATE INDEX "idx_grooming_proposals_status" ON "grooming_proposals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_context_items_section_id" ON "context_items" USING btree ("section_id");--> statement-breakpoint
CREATE INDEX "idx_context_sections_file_id" ON "context_sections" USING btree ("file_id");--> statement-breakpoint
CREATE INDEX "idx_coach_logs_supplement_time" ON "coach_logs" USING btree ("supplement_id","taken_at");--> statement-breakpoint
CREATE INDEX "idx_coach_nudges_state_scheduled" ON "coach_nudges" USING btree ("state","scheduled_for");--> statement-breakpoint
CREATE INDEX "idx_pipeline_runs_created" ON "pipeline_runs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_pipeline_runs_session" ON "pipeline_runs" USING btree ("session");--> statement-breakpoint
CREATE INDEX "idx_runs_ts" ON "runs" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "idx_runs_task" ON "runs" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "idx_runs_model" ON "runs" USING btree ("model");--> statement-breakpoint
CREATE INDEX "idx_email_reports_decided" ON "email_reports" USING btree ("decided");--> statement-breakpoint
CREATE INDEX "idx_email_reports_thread" ON "email_reports" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "idx_email_reports_created" ON "email_reports" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_email_reports_relevance" ON "email_reports" USING btree ("relevance_score");--> statement-breakpoint
CREATE INDEX "idx_email_reports_forwarded" ON "email_reports" USING btree ("forwarded_to_localshout");--> statement-breakpoint
CREATE INDEX "idx_email_reports_enriched_at" ON "email_reports" USING btree ("enriched_at");--> statement-breakpoint
CREATE INDEX "idx_briefing_analyses_created" ON "briefing_analyses" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_briefing_analyses_session" ON "briefing_analyses" USING btree ("session");--> statement-breakpoint
CREATE INDEX "idx_product_summaries_lookup" ON "product_summaries" USING btree ("product","app","environment","summary_type","window");--> statement-breakpoint
CREATE INDEX "idx_product_summaries_generated_at" ON "product_summaries" USING btree ("generated_at" DESC NULLS LAST);