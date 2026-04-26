CREATE TABLE "interrogate_answers" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "interrogate_answers_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"session_id" text NOT NULL,
	"ordinal" integer NOT NULL,
	"prompt_text" text NOT NULL,
	"answer_text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interrogate_evidence" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "interrogate_evidence_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"source_kind" text NOT NULL,
	"source_id" text,
	"stance" text NOT NULL,
	"weight" real DEFAULT 1 NOT NULL,
	"snippet" text,
	"discovered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"discovered_via_session_id" text,
	CONSTRAINT "interrogate_evidence_entity_type_check" CHECK ("interrogate_evidence"."entity_type" IN ('value','interest','priority','goal','experiment','nogo','tension','open_question')),
	CONSTRAINT "interrogate_evidence_source_kind_check" CHECK ("interrogate_evidence"."source_kind" IN ('journal','vault','task','calendar','answer','manual')),
	CONSTRAINT "interrogate_evidence_stance_check" CHECK ("interrogate_evidence"."stance" IN ('supports','contradicts')),
	CONSTRAINT "interrogate_evidence_weight_check" CHECK ("interrogate_evidence"."weight" >= 0)
);
--> statement-breakpoint
CREATE TABLE "interrogate_experiments" (
	"id" text PRIMARY KEY NOT NULL,
	"hypothesis" text NOT NULL,
	"window_start" timestamp with time zone,
	"window_end" timestamp with time zone,
	"review_at" timestamp with time zone,
	"verdict" text,
	"spawned_from_type" text,
	"spawned_from_id" text,
	"confidence" real DEFAULT 0.5 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"source" text DEFAULT 'self' NOT NULL,
	"last_reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "interrogate_experiments_spawned_from_type_check" CHECK ("interrogate_experiments"."spawned_from_type" IS NULL OR "interrogate_experiments"."spawned_from_type" IN ('value','interest','priority','goal','tension','open_question')),
	CONSTRAINT "interrogate_experiments_status_check" CHECK ("interrogate_experiments"."status" IN ('active','archived','superseded'))
);
--> statement-breakpoint
CREATE TABLE "interrogate_goals" (
	"id" text PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"priority_id" text,
	"success_criteria" text,
	"deadline" text,
	"goal_status" text DEFAULT 'active' NOT NULL,
	"confidence" real DEFAULT 0.5 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"source" text DEFAULT 'self' NOT NULL,
	"last_reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "interrogate_goals_goal_status_check" CHECK ("interrogate_goals"."goal_status" IN ('active','hit','missed','abandoned')),
	CONSTRAINT "interrogate_goals_status_check" CHECK ("interrogate_goals"."status" IN ('active','archived','superseded'))
);
--> statement-breakpoint
CREATE TABLE "interrogate_interests" (
	"id" text PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"intensity" text DEFAULT 'medium' NOT NULL,
	"confidence" real DEFAULT 0.5 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"source" text DEFAULT 'self' NOT NULL,
	"last_engaged_at" timestamp with time zone,
	"last_reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "interrogate_interests_intensity_check" CHECK ("interrogate_interests"."intensity" IN ('low','medium','high')),
	CONSTRAINT "interrogate_interests_status_check" CHECK ("interrogate_interests"."status" IN ('active','archived','superseded'))
);
--> statement-breakpoint
CREATE TABLE "interrogate_nogos" (
	"id" text PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"reason" text,
	"declared_at" timestamp with time zone DEFAULT now() NOT NULL,
	"confidence" real DEFAULT 0.5 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"source" text DEFAULT 'self' NOT NULL,
	"last_reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "interrogate_nogos_status_check" CHECK ("interrogate_nogos"."status" IN ('active','archived','superseded'))
);
--> statement-breakpoint
CREATE TABLE "interrogate_open_questions" (
	"id" text PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"raised_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolution" text,
	"confidence" real DEFAULT 0.5 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"source" text DEFAULT 'self' NOT NULL,
	"last_reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "interrogate_open_questions_status_check" CHECK ("interrogate_open_questions"."status" IN ('active','archived','superseded'))
);
--> statement-breakpoint
CREATE TABLE "interrogate_priorities" (
	"id" text PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"rank" integer,
	"serves_value_id" text,
	"timeframe" text,
	"verdict" text,
	"confidence" real DEFAULT 0.5 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"source" text DEFAULT 'self' NOT NULL,
	"last_reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "interrogate_priorities_status_check" CHECK ("interrogate_priorities"."status" IN ('active','archived','superseded'))
);
--> statement-breakpoint
CREATE TABLE "interrogate_proposals" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "interrogate_proposals_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"session_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"action" text NOT NULL,
	"payload" jsonb NOT NULL,
	"confidence" real NOT NULL,
	"rationale" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "interrogate_proposals_entity_type_check" CHECK ("interrogate_proposals"."entity_type" IN ('value','interest','priority','goal','experiment','nogo','tension','open_question')),
	CONSTRAINT "interrogate_proposals_action_check" CHECK ("interrogate_proposals"."action" IN ('create','update','archive','adjust_confidence')),
	CONSTRAINT "interrogate_proposals_status_check" CHECK ("interrogate_proposals"."status" IN ('pending','accepted','rejected','edited'))
);
--> statement-breakpoint
CREATE TABLE "interrogate_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"mode" text NOT NULL,
	"energy" text DEFAULT 'light' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"transcript_path" text,
	"raw_log_path" text,
	"transcript_text" text,
	CONSTRAINT "interrogate_sessions_energy_check" CHECK ("interrogate_sessions"."energy" IN ('light','deep'))
);
--> statement-breakpoint
CREATE TABLE "interrogate_tensions" (
	"id" text PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"resolving_how" text,
	"between_a_type" text,
	"between_a_id" text,
	"between_b_type" text,
	"between_b_id" text,
	"confidence" real DEFAULT 0.5 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"source" text DEFAULT 'self' NOT NULL,
	"last_reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "interrogate_tensions_between_a_type_check" CHECK ("interrogate_tensions"."between_a_type" IS NULL OR "interrogate_tensions"."between_a_type" IN ('value','interest','priority','goal','nogo','open_question')),
	CONSTRAINT "interrogate_tensions_between_b_type_check" CHECK ("interrogate_tensions"."between_b_type" IS NULL OR "interrogate_tensions"."between_b_type" IN ('value','interest','priority','goal','nogo','open_question')),
	CONSTRAINT "interrogate_tensions_status_check" CHECK ("interrogate_tensions"."status" IN ('active','archived','superseded'))
);
--> statement-breakpoint
CREATE TABLE "interrogate_values" (
	"id" text PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"rank" integer,
	"confidence" real DEFAULT 0.5 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"source" text DEFAULT 'self' NOT NULL,
	"last_reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "interrogate_values_status_check" CHECK ("interrogate_values"."status" IN ('active','archived','superseded'))
);
--> statement-breakpoint
ALTER TABLE "interrogate_answers" ADD CONSTRAINT "interrogate_answers_session_id_interrogate_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."interrogate_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interrogate_evidence" ADD CONSTRAINT "interrogate_evidence_discovered_via_session_id_interrogate_sessions_id_fk" FOREIGN KEY ("discovered_via_session_id") REFERENCES "public"."interrogate_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interrogate_goals" ADD CONSTRAINT "interrogate_goals_priority_id_interrogate_priorities_id_fk" FOREIGN KEY ("priority_id") REFERENCES "public"."interrogate_priorities"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interrogate_priorities" ADD CONSTRAINT "interrogate_priorities_serves_value_id_interrogate_values_id_fk" FOREIGN KEY ("serves_value_id") REFERENCES "public"."interrogate_values"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interrogate_proposals" ADD CONSTRAINT "interrogate_proposals_session_id_interrogate_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."interrogate_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_interrogate_answers_session" ON "interrogate_answers" USING btree ("session_id","ordinal");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_interrogate_answers_session_ordinal" ON "interrogate_answers" USING btree ("session_id","ordinal");--> statement-breakpoint
CREATE INDEX "idx_interrogate_evidence_entity" ON "interrogate_evidence" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_interrogate_evidence_source" ON "interrogate_evidence" USING btree ("source_kind","source_id");--> statement-breakpoint
CREATE INDEX "idx_interrogate_evidence_session" ON "interrogate_evidence" USING btree ("discovered_via_session_id");--> statement-breakpoint
CREATE INDEX "idx_interrogate_experiments_status" ON "interrogate_experiments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_interrogate_experiments_review" ON "interrogate_experiments" USING btree ("review_at");--> statement-breakpoint
CREATE INDEX "idx_interrogate_goals_status" ON "interrogate_goals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_interrogate_goals_priority" ON "interrogate_goals" USING btree ("priority_id");--> statement-breakpoint
CREATE INDEX "idx_interrogate_goals_goal_status" ON "interrogate_goals" USING btree ("goal_status");--> statement-breakpoint
CREATE INDEX "idx_interrogate_interests_status" ON "interrogate_interests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_interrogate_nogos_status" ON "interrogate_nogos" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_interrogate_open_questions_status" ON "interrogate_open_questions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_interrogate_priorities_status" ON "interrogate_priorities" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_interrogate_priorities_serves" ON "interrogate_priorities" USING btree ("serves_value_id");--> statement-breakpoint
CREATE INDEX "idx_interrogate_proposals_session" ON "interrogate_proposals" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_interrogate_proposals_status" ON "interrogate_proposals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_interrogate_sessions_started" ON "interrogate_sessions" USING btree ("started_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_interrogate_tensions_status" ON "interrogate_tensions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_interrogate_values_status" ON "interrogate_values" USING btree ("status");