CREATE TABLE "actors" (
	"id" text PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"kind" text DEFAULT 'human' NOT NULL,
	"color_token" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" text PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"color_token" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_status_check" CHECK ("projects"."status" IN ('active','paused','archived'))
);
--> statement-breakpoint
CREATE TABLE "vault_item_projects" (
	"vault_item_id" text NOT NULL,
	"project_id" text NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vault_item_projects_vault_item_id_project_id_pk" PRIMARY KEY("vault_item_id","project_id")
);
--> statement-breakpoint
CREATE TABLE "vault_notes" (
	"id" text PRIMARY KEY NOT NULL,
	"seq" bigint NOT NULL,
	"title" text NOT NULL,
	"type" text DEFAULT 'task' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"body" text,
	"raw_frontmatter" jsonb,
	"ai_priority" smallint,
	"ai_rationale" text,
	"ai_rationale_model" text,
	"manual_priority" smallint,
	"priority_confidence" real,
	"actionability" text,
	"sort_position" integer,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	"assigned_to" text DEFAULT 'unassigned' NOT NULL,
	"route" text DEFAULT 'unrouted' NOT NULL,
	"agent_type" text,
	"executor" text,
	"suggested_route" text,
	"suggested_agent_type" text,
	"suggested_ac" text,
	"suggested_skills" text[] DEFAULT '{}'::text[] NOT NULL,
	"suggested_parent_id" text,
	"parent_id" text,
	"is_epic" boolean DEFAULT false NOT NULL,
	"epic_started_at" timestamp with time zone,
	"ready" boolean DEFAULT false NOT NULL,
	"grooming_status" text DEFAULT 'ungroomed' NOT NULL,
	"grooming_started_at" timestamp with time zone,
	"acceptance_criteria" text,
	"definition_of_done" text,
	"blocked_by" text,
	"blocked_reason" text,
	"blocked_at" timestamp with time zone,
	"source_kind" text,
	"source_ref" text,
	"source_url" text,
	"source_signal" text,
	"cited_lesson_ids" text[] DEFAULT '{}'::text[] NOT NULL,
	"nudge_count" integer DEFAULT 0 NOT NULL,
	"last_nudged_at" timestamp with time zone,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"due_at" timestamp with time zone,
	CONSTRAINT "vault_notes_seq_unique" UNIQUE("seq"),
	CONSTRAINT "vault_notes_status_check" CHECK ("vault_notes"."status" IN ('active','inbox','archived','done')),
	CONSTRAINT "vault_notes_route_check" CHECK ("vault_notes"."route" IN ('unrouted','marvin','jimbo','claude_code')),
	CONSTRAINT "vault_notes_grooming_status_check" CHECK ("vault_notes"."grooming_status" IN ('ungroomed','intake_rejected','classified','decomposed','ready')),
	CONSTRAINT "vault_notes_actionability_check" CHECK ("vault_notes"."actionability" IS NULL OR "vault_notes"."actionability" IN ('vague','clear','needs-context','needs-breakdown'))
);
--> statement-breakpoint
CREATE TABLE "dispatch_queue" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"task_id" text NOT NULL,
	"task_source" text DEFAULT 'vault' NOT NULL,
	"flow" text DEFAULT 'commission' NOT NULL,
	"agent_type" text NOT NULL,
	"executor" text,
	"skill" text,
	"skill_context" text,
	"batch_id" text,
	"status" text DEFAULT 'proposed' NOT NULL,
	"dispatch_prompt" text,
	"dispatch_repo" text,
	"result_summary" text,
	"result_artifacts" text,
	"error_message" text,
	"rejection_reason" text,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"issue_number" integer,
	"issue_repo" text,
	"issue_title" text,
	"issue_body" text,
	"pr_url" text,
	"pr_state" text,
	"completed_model" text,
	"proposed_at" timestamp with time zone,
	"approved_at" timestamp with time zone,
	"rejected_at" timestamp with time zone,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dispatch_status_check" CHECK ("dispatch_queue"."status" IN ('proposed','approved','rejected','completed','failed','removed')),
	CONSTRAINT "dispatch_flow_check" CHECK ("dispatch_queue"."flow" IN ('commission','groom')),
	CONSTRAINT "dispatch_pr_state_check" CHECK ("dispatch_queue"."pr_state" IS NULL OR "dispatch_queue"."pr_state" IN ('open','merged','rejected','closed'))
);
--> statement-breakpoint
CREATE TABLE "note_activity" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"note_id" text NOT NULL,
	"ts" timestamp with time zone DEFAULT now() NOT NULL,
	"actor" text NOT NULL,
	"action" text NOT NULL,
	"from_value" text,
	"to_value" text,
	"reason" text,
	"context" jsonb
);
--> statement-breakpoint
CREATE TABLE "system_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"ts" timestamp with time zone NOT NULL,
	"source" text NOT NULL,
	"kind" text NOT NULL,
	"actor" text,
	"title" text NOT NULL,
	"detail" text,
	"ref_type" text,
	"ref_id" text,
	"correlation_id" text,
	"level" text DEFAULT 'info' NOT NULL,
	CONSTRAINT "system_events_level_check" CHECK ("system_events"."level" IN ('debug','info','warn','error'))
);
--> statement-breakpoint
CREATE TABLE "attachments" (
	"id" text PRIMARY KEY NOT NULL,
	"thread_message_id" text NOT NULL,
	"kind" text NOT NULL,
	"filename" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"url" text NOT NULL,
	"caption" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "thread_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"vault_item_id" text NOT NULL,
	"author_actor_id" text NOT NULL,
	"kind" text NOT NULL,
	"body" text NOT NULL,
	"in_reply_to" text,
	"answered_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "thread_messages_kind_check" CHECK ("thread_messages"."kind" IN ('comment','question','correction'))
);
--> statement-breakpoint
CREATE TABLE "grooming_audit" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"note_id" text NOT NULL,
	"from_status" text NOT NULL,
	"to_status" text NOT NULL,
	"actor" text NOT NULL,
	"reason" text,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grooming_questions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"note_id" text NOT NULL,
	"question" text NOT NULL,
	"delegable" boolean DEFAULT false NOT NULL,
	"answer" text,
	"answered_by" text,
	"dispatch_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "costs" (
	"id" text PRIMARY KEY NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"task_type" text NOT NULL,
	"input_tokens" integer NOT NULL,
	"output_tokens" integer NOT NULL,
	"estimated_cost" real NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "vault_item_projects" ADD CONSTRAINT "vault_item_projects_vault_item_id_vault_notes_id_fk" FOREIGN KEY ("vault_item_id") REFERENCES "public"."vault_notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vault_item_projects" ADD CONSTRAINT "vault_item_projects_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vault_notes" ADD CONSTRAINT "vault_notes_parent_id_vault_notes_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."vault_notes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_activity" ADD CONSTRAINT "note_activity_note_id_vault_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."vault_notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_thread_message_id_thread_messages_id_fk" FOREIGN KEY ("thread_message_id") REFERENCES "public"."thread_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thread_messages" ADD CONSTRAINT "thread_messages_vault_item_id_vault_notes_id_fk" FOREIGN KEY ("vault_item_id") REFERENCES "public"."vault_notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thread_messages" ADD CONSTRAINT "thread_messages_in_reply_to_thread_messages_id_fk" FOREIGN KEY ("in_reply_to") REFERENCES "public"."thread_messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thread_messages" ADD CONSTRAINT "thread_messages_answered_by_thread_messages_id_fk" FOREIGN KEY ("answered_by") REFERENCES "public"."thread_messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grooming_audit" ADD CONSTRAINT "grooming_audit_note_id_vault_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."vault_notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grooming_questions" ADD CONSTRAINT "grooming_questions_note_id_vault_notes_id_fk" FOREIGN KEY ("note_id") REFERENCES "public"."vault_notes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_vault_item_projects_project" ON "vault_item_projects" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_vault_item_projects_one_primary" ON "vault_item_projects" USING btree ("vault_item_id") WHERE "vault_item_projects"."is_primary";--> statement-breakpoint
CREATE INDEX "idx_vault_type_status" ON "vault_notes" USING btree ("type","status");--> statement-breakpoint
CREATE INDEX "idx_vault_ai_priority" ON "vault_notes" USING btree ("ai_priority");--> statement-breakpoint
CREATE INDEX "idx_vault_manual_priority" ON "vault_notes" USING btree ("manual_priority");--> statement-breakpoint
CREATE INDEX "idx_vault_parent_id" ON "vault_notes" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "idx_vault_route" ON "vault_notes" USING btree ("route");--> statement-breakpoint
CREATE INDEX "idx_vault_assigned_to" ON "vault_notes" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "idx_vault_status_assigned_to" ON "vault_notes" USING btree ("status","assigned_to");--> statement-breakpoint
CREATE INDEX "idx_vault_ready" ON "vault_notes" USING btree ("ready");--> statement-breakpoint
CREATE INDEX "idx_vault_grooming_status" ON "vault_notes" USING btree ("grooming_status");--> statement-breakpoint
CREATE INDEX "idx_vault_executor" ON "vault_notes" USING btree ("executor");--> statement-breakpoint
CREATE INDEX "idx_vault_is_epic" ON "vault_notes" USING btree ("is_epic");--> statement-breakpoint
CREATE INDEX "idx_vault_due_at" ON "vault_notes" USING btree ("due_at");--> statement-breakpoint
CREATE INDEX "idx_dispatch_status" ON "dispatch_queue" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_dispatch_task_id" ON "dispatch_queue" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "idx_dispatch_batch_id" ON "dispatch_queue" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "idx_dispatch_pr_url" ON "dispatch_queue" USING btree ("pr_url");--> statement-breakpoint
CREATE INDEX "idx_dispatch_executor_status" ON "dispatch_queue" USING btree ("executor","status");--> statement-breakpoint
CREATE INDEX "idx_note_activity_note" ON "note_activity" USING btree ("note_id","ts" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_note_activity_actor_action" ON "note_activity" USING btree ("actor","action","ts" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_note_activity_action_ts" ON "note_activity" USING btree ("action","ts" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_system_events_ts" ON "system_events" USING btree ("ts" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_system_events_ref" ON "system_events" USING btree ("ref_type","ref_id");--> statement-breakpoint
CREATE INDEX "idx_system_events_correlation" ON "system_events" USING btree ("correlation_id");--> statement-breakpoint
CREATE INDEX "idx_system_events_source" ON "system_events" USING btree ("source","ts" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_system_events_kind" ON "system_events" USING btree ("kind","ts" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_attachments_message" ON "attachments" USING btree ("thread_message_id");--> statement-breakpoint
CREATE INDEX "idx_thread_messages_vault" ON "thread_messages" USING btree ("vault_item_id");--> statement-breakpoint
CREATE INDEX "idx_grooming_audit_note" ON "grooming_audit" USING btree ("note_id");--> statement-breakpoint
CREATE INDEX "idx_grooming_audit_created" ON "grooming_audit" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_grooming_questions_note" ON "grooming_questions" USING btree ("note_id");--> statement-breakpoint
CREATE INDEX "idx_grooming_questions_pending" ON "grooming_questions" USING btree ("note_id") WHERE "grooming_questions"."resolved_at" IS NULL;--> statement-breakpoint
CREATE INDEX "idx_costs_ts" ON "costs" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "idx_costs_model" ON "costs" USING btree ("model");--> statement-breakpoint
CREATE INDEX "idx_costs_task" ON "costs" USING btree ("task_type");