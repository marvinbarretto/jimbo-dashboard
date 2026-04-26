CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
CREATE TABLE "search_index" (
	"source" text NOT NULL,
	"source_id" text NOT NULL,
	"title" text,
	"body" text,
	"search_vector" "tsvector" GENERATED ALWAYS AS (setweight(to_tsvector('english', coalesce(title,'')), 'A') || setweight(to_tsvector('english', coalesce(body,'')), 'B')) STORED,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "search_index_source_source_id_pk" PRIMARY KEY("source","source_id")
);
--> statement-breakpoint
CREATE INDEX "idx_search_index_vector" ON "search_index" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "idx_search_index_title_trgm" ON "search_index" USING gin (title gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "idx_search_index_body_trgm" ON "search_index" USING gin (body gin_trgm_ops);