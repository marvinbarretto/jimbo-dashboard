ALTER TABLE "models" ADD COLUMN "input_price_per_million" numeric(10, 6);--> statement-breakpoint
ALTER TABLE "models" ADD COLUMN "output_price_per_million" numeric(10, 6);--> statement-breakpoint
ALTER TABLE "models" ADD COLUMN "cache_read_price_per_million" numeric(10, 6);--> statement-breakpoint
ALTER TABLE "models" ADD COLUMN "cache_write_price_per_million" numeric(10, 6);