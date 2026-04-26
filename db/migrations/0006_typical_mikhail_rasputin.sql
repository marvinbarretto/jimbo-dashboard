ALTER TABLE "costs" ADD COLUMN "dispatch_id" bigint;--> statement-breakpoint
ALTER TABLE "costs" ADD COLUMN "turn_number" integer;--> statement-breakpoint
ALTER TABLE "costs" ADD COLUMN "cache_read_tokens" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "costs" ADD COLUMN "cache_write_tokens" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "costs" ADD COLUMN "duration_ms" integer;--> statement-breakpoint
ALTER TABLE "costs" ADD COLUMN "stop_reason" text;--> statement-breakpoint
ALTER TABLE "costs" ADD COLUMN "tool_use_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "costs" ADD COLUMN "prompt_version_id" uuid;--> statement-breakpoint
ALTER TABLE "costs" ADD COLUMN "actor" text;--> statement-breakpoint
ALTER TABLE "costs" ADD COLUMN "started_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "costs" ADD COLUMN "ended_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "costs" ADD CONSTRAINT "costs_dispatch_id_dispatch_queue_id_fk" FOREIGN KEY ("dispatch_id") REFERENCES "public"."dispatch_queue"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_costs_dispatch" ON "costs" USING btree ("dispatch_id");--> statement-breakpoint
CREATE INDEX "idx_costs_actor" ON "costs" USING btree ("actor");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_costs_dispatch_turn" ON "costs" USING btree ("dispatch_id","turn_number");