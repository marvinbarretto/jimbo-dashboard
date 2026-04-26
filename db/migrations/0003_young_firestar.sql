ALTER TABLE "actors" ADD COLUMN "runtime" text;--> statement-breakpoint
ALTER TABLE "actors" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "actors" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "owner_actor_id" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "criteria" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "repo_url" text;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_actor_id_actors_id_fk" FOREIGN KEY ("owner_actor_id") REFERENCES "public"."actors"("id") ON DELETE restrict ON UPDATE no action;