CREATE TABLE "shopping_items" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"qty" integer DEFAULT 1 NOT NULL,
	"unit" text,
	"note" text,
	"url" text,
	"store" text,
	"status" text DEFAULT 'active' NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	"checked_at" timestamp with time zone,
	CONSTRAINT "shopping_items_qty_check" CHECK ("shopping_items"."qty" > 0),
	CONSTRAINT "shopping_items_status_check" CHECK ("shopping_items"."status" IN ('active','bought'))
);
--> statement-breakpoint
CREATE INDEX "idx_shopping_items_status_added" ON "shopping_items" USING btree ("status","added_at");
