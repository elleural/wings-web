ALTER TABLE "agent_decisions" ADD COLUMN "llm_compute_seconds" numeric(12, 4);--> statement-breakpoint
ALTER TABLE "agent_decisions" ADD COLUMN "llm_model" text;--> statement-breakpoint
ALTER TABLE "skill_invocations" ADD COLUMN "llm_compute_seconds" numeric(12, 4);--> statement-breakpoint
ALTER TABLE "skill_invocations" ADD COLUMN "llm_model" text;