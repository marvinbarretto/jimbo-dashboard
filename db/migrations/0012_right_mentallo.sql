ALTER TABLE "vault_notes" DROP CONSTRAINT "vault_notes_grooming_status_check";--> statement-breakpoint
ALTER TABLE "vault_notes" ADD CONSTRAINT "vault_notes_grooming_status_check" CHECK ("vault_notes"."grooming_status" IN ('ungroomed','needs_rework','intake_rejected','intake_complete','classified','decomposed','ready'));
