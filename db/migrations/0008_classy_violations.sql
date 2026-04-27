-- Rewrite legacy slash-path skill values to flat slugs that match seed.
-- Existing rows: vault-grooming/analyse → vault-grooming-analyse, etc.
UPDATE "dispatch_queue" SET "skill" = REPLACE("skill", '/', '-') WHERE "skill" LIKE '%/%';--> statement-breakpoint
-- Null any skill values that don't resolve in the registry — they'd block
-- the FK validation. Cost: history loses skill linkage for rows whose value
-- was orphaned. Acceptable since they're terminal-state historical records.
UPDATE "dispatch_queue" SET "skill" = NULL
  WHERE "skill" IS NOT NULL AND "skill" NOT IN (SELECT "id" FROM "skills");--> statement-breakpoint
ALTER TABLE "dispatch_queue" ADD CONSTRAINT "dispatch_queue_skill_skills_id_fk" FOREIGN KEY ("skill") REFERENCES "public"."skills"("id") ON DELETE set null ON UPDATE no action;